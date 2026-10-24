export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { v4 as uuidv4 } from "uuid";
import { consumeCredits, refundCredits, narrationMultiplier } from "@/lib/credits";
import {
  GEMINI_TTS_MODELS,
  GEMINI_VOICES,
} from "@/lib/ttsSettings";
import { buildStyle, callGeminiTts, chunkText, mergeWavs } from "@/lib/tts.gemini";
import type { TtsProvider, GeminiTtsModelKey } from "@/lib/ttsSettings";

// ── POST /api/storyboard/[id]/scenes/[sceneId]/generate-narration ────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sceneId: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({ where: { id: params.id } });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const scene = await prisma.storyboardScene.findUnique({ where: { id: params.sceneId } });
  if (!scene || scene.mainId !== params.id)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

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
    ttsCommonRules?: string;
    ttsNegativePrompt?: string;
  };

  // ── バリデーション ────────────────────────────────────────────────────────────

  const transcript = (body.transcript ?? "").trim();
  if (!transcript)
    return NextResponse.json({ ok: false, message: "台本テキストが空です" }, { status: 400 });

  const mult = narrationMultiplier(transcript);
  const credit = await consumeCredits(session.userId, "narration", sb.workspaceId ?? null, mult);
  if (!credit.ok) return NextResponse.json({ ok: false, message: credit.message }, { status: 402 });

  const provider  = body.provider ?? "google-gemini";
  if (provider !== "google-gemini")
    return NextResponse.json({ ok: false, message: "未対応のプロバイダーです" }, { status: 400 });

  const modelKey = body.model ?? "gemini-tts-high";
  const modelDef = GEMINI_TTS_MODELS.find((m) => m.key === modelKey);
  if (!modelDef)
    return NextResponse.json({ ok: false, message: "未対応のモデルです" }, { status: 400 });

  const voice = body.voice ?? "Kore";
  if (!(GEMINI_VOICES as readonly string[]).includes(voice))
    return NextResponse.json({ ok: false, message: "未対応の音声です" }, { status: 400 });

  const style       = body.style      ?? "";
  const pacing      = body.pacing     ?? "normal";
  const tone        = body.tone       ?? "neutral";
  const accent      = body.accent     ?? "";
  const autoChunk   = body.autoChunk  ?? true;
  const maxChunkLen = Math.max(50, Math.min(2000, body.maxChunkLength ?? 500));
  const retryCount  = Math.max(0, Math.min(5, body.retryCount ?? 2));

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

  // ── 音声生成 ─────────────────────────────────────────────────────────────────

  try {
    const chunks = autoChunk ? chunkText(transcript, maxChunkLen) : [transcript];
    const wavBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const styleText = buildStyle({ style, pacing, tone, accent, commonRules: body.ttsCommonRules, negativePrompt: body.ttsNegativePrompt });
      const wav = await callGeminiTts(modelDef.providerModelId, chunk, styleText, voice, apiKey, retryCount);
      wavBuffers.push(wav);
    }
    const finalWav = mergeWavs(wavBuffers);

    // ── R2 アップロード ───────────────────────────────────────────────────────
    const wsSegment = sb.workspaceId ?? "no-workspace";
    const fileId    = uuidv4();
    const key       = `user/${session.userId}/${wsSegment}/narration/${params.sceneId}/${fileId}.wav`;

    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: finalWav,
        ContentType: "audio/wav",
      }));
    } catch (e) {
      await logError("generate-narration", `R2 upload error: ${e}`, {
        userId: session.userId,
        detail: { key },
      });
      return NextResponse.json({ ok: false, message: "音声ファイルのアップロードに失敗しました" }, { status: 500 });
    }

    const audioUrl = `${R2_PUBLIC_URL}/${key}`;

    // WAV ヘッダーの data チャンクサイズ（offset 40）から尺を計算
    // buildWav: sampleRate=24000, channels=1, bitDepth=16 → bytesPerSec = 48000
    const audioDurationSec = finalWav.readUInt32LE(40) / 48000;
    const audioDurationStr = String(Math.round(audioDurationSec * 100) / 100);

    // ── DB 更新 ───────────────────────────────────────────────────────────────
    await prisma.storyboardScene.update({
      where: { id: params.sceneId },
      data: {
        audioUrl,
        audioText: transcript,
        duration: audioDurationStr,
        audioSettings: {
          speaker: "",
          emotion: tone,
          speed: pacing,
          ttsProvider: provider,
          ttsModel: modelKey,
          ttsVoice: voice,
          ttsStyle: style,
          ttsPacing: pacing,
          ttsTone: tone,
          ttsAccent: accent,
        },
      },
    });

    // ── File テーブルに登録（ファイルパネルで表示）──────────────────────────────
    try {
      const sceneLabel = scene.sceneNo ? `scene${scene.sceneNo}` : params.sceneId.slice(0, 8);
      await (prisma.file as any).create({
        data: {
          userId: session.userId,
          workspaceId: sb.workspaceId ?? null,
          storageKey: key,
          fileUrl: audioUrl,
          fileName: `narration_${sceneLabel}_${fileId}.wav`,
          fileType: "audio",
          mimeType: "audio/wav",
          sizeBytes: BigInt(finalWav.length),
        },
      });
    } catch {
      // ファイル登録失敗は無視（音声生成自体は成功）
    }

    return NextResponse.json({ ok: true, audioUrl, audioDuration: audioDurationSec });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    await logError("generate-narration", msg, {
      userId: session.userId,
      detail: {
        sceneId: params.sceneId,
        mainId: params.id,
        provider,
        model: modelKey,
      },
    });
    await refundCredits(session.userId, "narration", sb.workspaceId ?? null, mult);

    if (msg.includes("401") || msg.includes("403"))
      return NextResponse.json({ ok: false, message: "Google APIキーが無効または権限がありません" }, { status: 500 });
    if (msg.includes("429"))
      return NextResponse.json({ ok: false, message: "Google APIの利用上限に達しました" }, { status: 429 });
    if (msg.includes("音声データが返されませんでした"))
      return NextResponse.json({ ok: false, message: "音声生成に失敗しました。再試行しましたが完了できませんでした。" }, { status: 500 });

    return NextResponse.json({ ok: false, message: "音声生成に失敗しました。しばらく後に再試行してください。" }, { status: 500 });
  }
}
