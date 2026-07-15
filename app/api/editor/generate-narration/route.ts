export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { v4 as uuidv4 } from "uuid";
import { checkFreeAccess } from "@/lib/free-limit";
import {
  GEMINI_TTS_MODELS,
  GEMINI_VOICES,
  PACING_TO_INSTRUCTION,
  TONE_TO_INSTRUCTION,
} from "@/lib/ttsSettings";
import type { TtsProvider, GeminiTtsModelKey } from "@/lib/ttsSettings";

const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const NON_RETRYABLE = new Set([400, 401, 403, 404]);

function buildWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm] as unknown as Uint8Array[]);
}

function mergeWavs(wavs: Buffer[]): Buffer {
  if (wavs.length === 1) return wavs[0];
  const pcms = wavs.map((w) => w.slice(44));
  return buildWav(Buffer.concat(pcms as unknown as Uint8Array[]));
}

function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const parts = text.split(/(?<=[。！？\n])/);
  let cur = "";
  for (const p of parts) {
    if (cur.length + p.length > maxLen && cur.length > 0) {
      chunks.push(cur.trim());
      cur = p;
    } else {
      cur += p;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [text];
}

function buildPrompt(transcript: string, opts: {
  style?: string;
  pacing?: string;
  tone?: string;
  accent?: string;
  commonRules?: string;
  negativePrompt?: string;
}): string {
  const lines = [
    "Generate spoken audio using the performance instructions below.",
    "Read only the text inside the TRANSCRIPT section.",
    "Do not read the instructions or section headings aloud.",
  ];
  const notes: string[] = [];
  if (opts.style?.trim()) notes.push(`Style: ${opts.style.trim()}`);
  if (opts.pacing && PACING_TO_INSTRUCTION[opts.pacing]) notes.push(`Pacing: ${PACING_TO_INSTRUCTION[opts.pacing]}`);
  if (opts.tone && TONE_TO_INSTRUCTION[opts.tone]) notes.push(`Tone: ${TONE_TO_INSTRUCTION[opts.tone]}`);
  if (opts.accent?.trim()) notes.push(`Accent: ${opts.accent.trim()}`);
  if (opts.commonRules?.trim()) notes.push(`Additional rules: ${opts.commonRules.trim()}`);
  if (opts.negativePrompt?.trim()) notes.push(`Avoid: ${opts.negativePrompt.trim()}`);
  if (notes.length > 0) { lines.push("", "# DIRECTOR'S NOTES"); lines.push(...notes); }
  lines.push("", "# TRANSCRIPT", transcript);
  return lines.join("\n");
}

async function callGeminiTts(providerModelId: string, prompt: string, voice: string, apiKey: string, maxRetry: number): Promise<Buffer> {
  const url = `${GOOGLE_AI_BASE}/models/${providerModelId}:generateContent?key=${apiKey}`;
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    },
  });
  let lastErr: Error = new Error("Unknown error");
  for (let attempt = 0; attempt <= maxRetry; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 1200 * attempt));
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      if (NON_RETRYABLE.has(res.status)) throw new Error(`Gemini TTS ${res.status}: ${errText}`);
      lastErr = new Error(`Gemini TTS ${res.status}: ${errText}`);
      continue;
    }
    let data: unknown;
    try { data = await res.json(); } catch { lastErr = new Error("Gemini TTS: JSON parse error"); continue; }
    const inlineData = (data as any)?.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    if (!inlineData?.data) { lastErr = new Error("Gemini TTS: 音声データが返されませんでした"); continue; }
    return buildWav(Buffer.from(inlineData.data as string, "base64"));
  }
  throw lastErr;
}

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const { ok: accessOk, message: accessMsg } = await checkFreeAccess(session.userId, "audio", "");
  if (!accessOk) return NextResponse.json({ ok: false, message: accessMsg }, { status: 402 });

  const body = await request.json().catch(() => ({})) as {
    transcript?: string;
    provider?: TtsProvider;
    model?: GeminiTtsModelKey;
    voice?: string;
    style?: string;
    pacing?: string;
    tone?: string;
    accent?: string;
    autoChunk?: boolean;
    maxChunkLength?: number;
    retryCount?: number;
    workspaceId?: string;
    ttsCommonRules?: string;
    ttsNegativePrompt?: string;
  };

  const transcript = (body.transcript ?? "").trim();
  if (!transcript) return NextResponse.json({ ok: false, message: "台本テキストが空です" }, { status: 400 });

  const provider = body.provider ?? "google-gemini";
  if (provider !== "google-gemini") return NextResponse.json({ ok: false, message: "未対応のプロバイダーです" }, { status: 400 });

  const modelKey = body.model ?? "gemini-tts-high";
  const modelDef = GEMINI_TTS_MODELS.find((m) => m.key === modelKey);
  if (!modelDef) return NextResponse.json({ ok: false, message: "未対応のモデルです" }, { status: 400 });

  const voice = body.voice ?? "Kore";
  if (!(GEMINI_VOICES as readonly string[]).includes(voice)) return NextResponse.json({ ok: false, message: "未対応の音声です" }, { status: 400 });

  const style      = body.style   ?? "";
  const pacing     = body.pacing  ?? "normal";
  const tone       = body.tone    ?? "neutral";
  const accent     = body.accent  ?? "";
  const autoChunk  = body.autoChunk ?? true;
  const maxChunkLen = Math.max(50, Math.min(2000, body.maxChunkLength ?? 500));
  const retryCount = Math.max(0, Math.min(5, body.retryCount ?? 2));
  const workspaceId = body.workspaceId ?? null;

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

  const userId = session.userId;

  try {
    const chunks = autoChunk ? chunkText(transcript, maxChunkLen) : [transcript];
    const wavBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const prompt = buildPrompt(chunk, { style, pacing, tone, accent, commonRules: body.ttsCommonRules, negativePrompt: body.ttsNegativePrompt });
      wavBuffers.push(await callGeminiTts(modelDef.providerModelId, prompt, voice, apiKey, retryCount));
    }
    const finalWav = mergeWavs(wavBuffers);

    const fileId = uuidv4();
    const key = `user/${userId}/editor/narration/${fileId}.wav`;
    await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: finalWav, ContentType: "audio/wav" }));
    const audioUrl = `${R2_PUBLIC_URL}/${key}`;

    await prisma.file.create({
      data: {
        userId,
        workspaceId,
        storageKey: key,
        fileUrl: audioUrl,
        fileName: `narration_${fileId}.wav`,
        fileType: "audio",
        mimeType: "audio/wav",
        sizeBytes: BigInt(finalWav.length),
      },
    }).catch(() => {});

    await logGeneration(userId, "audio");
    return NextResponse.json({ ok: true, audioUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError("editor-generate-narration", msg, { userId, detail: { provider, model: modelKey } });
    if (msg.includes("401") || msg.includes("403")) return NextResponse.json({ ok: false, message: "Google APIキーが無効または権限がありません" }, { status: 500 });
    if (msg.includes("429")) return NextResponse.json({ ok: false, message: "Google APIの利用上限に達しました" }, { status: 429 });
    return NextResponse.json({ ok: false, message: "音声生成に失敗しました。しばらく後に再試行してください。" }, { status: 500 });
  }
}
