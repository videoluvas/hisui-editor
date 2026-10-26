export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { v4 as uuidv4 } from "uuid";
import { chargeNarration, refundNarration } from "@/lib/plan-usage";
import { GEMINI_TTS_MODELS, GEMINI_VOICES } from "@/lib/ttsSettings";
import type { TtsProvider, GeminiTtsModelKey } from "@/lib/ttsSettings";
import { buildStyle, callGeminiTts, chunkText, mergeWavs } from "@/lib/tts.gemini";

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

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

  // スタンダードは今月のナレーション文字数、法人はクレジット（無料は使えない）
  const charged = await chargeNarration(userId, transcript, workspaceId);
  if (!charged.ok) return NextResponse.json({ ok: false, code: charged.code, message: charged.message }, { status: 402 });

  try {
    const chunks = autoChunk ? chunkText(transcript, maxChunkLen) : [transcript];
    const wavBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const styleText = buildStyle({ style, pacing, tone, accent, commonRules: body.ttsCommonRules, negativePrompt: body.ttsNegativePrompt });
      wavBuffers.push(await callGeminiTts(modelDef.providerModelId, chunk, styleText, voice, apiKey, retryCount));
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

    return NextResponse.json({ ok: true, audioUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError("editor-generate-narration", msg, { userId, detail: { provider, model: modelKey } });
    await refundNarration(userId, charged.charge, workspaceId);
    if (msg.includes("401") || msg.includes("403")) return NextResponse.json({ ok: false, message: "Google APIキーが無効または権限がありません" }, { status: 500 });
    if (msg.includes("429")) return NextResponse.json({ ok: false, message: "Google APIの利用上限に達しました" }, { status: 429 });
    return NextResponse.json({ ok: false, message: "音声生成に失敗しました。しばらく後に再試行してください。" }, { status: 500 });
  }
}
