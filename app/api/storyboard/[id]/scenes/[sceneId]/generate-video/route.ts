export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";


const ARK_API_BASE   = "https://ark.ap-southeast.bytepluses.com/api/v3";
const SEEDANCE_MODEL = "seedance-1-5-pro-251215";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const VEO_MODEL_IDS: Record<string, string> = {
  "veo-3":      process.env.VEO_MODEL      ?? "veo-3.1-generate-preview",
  "veo-3-lite": process.env.VEO_LITE_MODEL ?? "veo-3.1-lite-generate-preview",
};

// Veo Lite constraints
const VEO_LITE_MAX_DURATION = 8;
const VEO_LITE_RESOLUTIONS  = new Set(["720p", "1080p"]);
const VEO_LITE_RATIOS       = new Set(["16:9", "9:16"]);

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
    videoModel?: string;
    instructions?: string;
    resolution?: string;
    ratio?: string;
    duration?: number;
    generateAudio?: boolean;
    cameraFixed?: boolean;
    watermark?: boolean;
    vidCommonRules?: string;
    vidNegativePrompt?: string;
  };

  const {
    videoModel    = "seedance-1-5-pro",
    resolution    = "720p",
    ratio         = "16:9",
    duration      = 5,
    generateAudio = false,
    cameraFixed   = false,
    watermark     = false,
  } = body;

  // ルール・ネガティブプロンプトをインストラクションに結合
  const instructionParts = [body.instructions?.trim() ?? ""];
  if (body.vidCommonRules?.trim()) instructionParts.push(body.vidCommonRules.trim());
  if (body.vidNegativePrompt?.trim()) instructionParts.push(`以下の要素は含めないでください: ${body.vidNegativePrompt.trim()}`);
  const instructions = instructionParts.filter(Boolean).join(" ");

  // ── Google Veo ───────────────────────────────────────────────────────────────
  if (videoModel === "veo-3" || videoModel === "veo-3-lite") {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey)
      return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    const modelId = VEO_MODEL_IDS[videoModel];

    // Veo Lite constraints
    const clampedResolution = videoModel === "veo-3-lite" && !VEO_LITE_RESOLUTIONS.has(resolution) ? "720p" : resolution;
    const clampedRatio      = videoModel === "veo-3-lite" && !VEO_LITE_RATIOS.has(ratio) ? "16:9" : (ratio === "adaptive" ? "16:9" : ratio);
    // durationSeconds must be 4, 6, or 8
    const rawDuration = duration === -1 ? 8 : (videoModel === "veo-3-lite" ? Math.min(duration, VEO_LITE_MAX_DURATION) : Math.max(4, Math.min(8, duration)));
    const allowedDurations = [4, 6, 8] as const;
    const clampedDuration  = allowedDurations.reduce((prev, curr) =>
      Math.abs(curr - rawDuration) < Math.abs(prev - rawDuration) ? curr : prev
    );

    const prompt = instructions.trim() || "動画を生成してください";

    const instance: Record<string, unknown> = { prompt };

    // 参照画像があれば追加
    if (scene.imgUrl) {
      try {
        const imgRes = await fetch(scene.imgUrl);
        const imageBytes = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
        instance.image = { bytesBase64Encoded: imageBytes, mimeType: "image/jpeg" };
      } catch {
        // 参照画像が取得できなくても続行
      }
    }

    if (!instructions.trim() && !scene.imgUrl)
      return NextResponse.json({ ok: false, message: "プロンプトまたは画像が必要です" }, { status: 400 });

    const veoParams: Record<string, unknown> = {
      aspectRatio: clampedRatio,
      resolution: clampedResolution,
      durationSeconds: clampedDuration,
      sampleCount: 1,
    };
    if (videoModel === "veo-3") veoParams.generateAudio = generateAudio === true;

    const veoBody = { instances: [instance], parameters: veoParams };

    try {
      const resp = await fetch(`${GOOGLE_AI_BASE}/models/${modelId}:predictLongRunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": googleApiKey },
        body: JSON.stringify(veoBody),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Google Veo ${resp.status} (model: ${modelId}): ${errText}`);
      }

      const data = await resp.json() as { name?: string; error?: { message: string } };
      if (!data.name) throw new Error(data.error?.message ?? "オペレーション名が返されませんでした");

      console.log(`[Veo] operation name returned: ${data.name}`);

      await prisma.storyboardScene.update({
        where: { id: params.sceneId },
        data: {
          videoId: `veo:${data.name}`,
          videoStatus: "queued",
          videoStatusYn: false,
          videoStartTime: new Date(),
        },
      });

      return NextResponse.json({ ok: true, taskId: `veo:${data.name}` });
    } catch (e) {
      await logError("generate-video", `Veo create error: ${e}`, {
        userId: session.userId,
        detail: { storyboardId: params.id, sceneId: params.sceneId },
      });
      return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
    }
  }

  // ── BytePlus Seedance ────────────────────────────────────────────────────────
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "ARK_API_KEY が設定されていません" }, { status: 500 });

  // content 配列を構築
  const content: Record<string, unknown>[] = [];

  if (scene.imgUrl) {
    content.push({
      type: "image_url",
      image_url: { url: scene.imgUrl },
      role: "first_frame",
    });
  }

  const text = instructions.trim();
  if (text) content.push({ type: "text", text });

  if (content.length === 0)
    return NextResponse.json({ ok: false, message: "プロンプトまたは画像が必要です" }, { status: 400 });

  const reqBody: Record<string, unknown> = {
    model: SEEDANCE_MODEL,
    content,
    resolution,
    ratio,
    duration: duration === -1 ? -1 : Math.max(4, Math.min(12, Number(duration))),
    generate_audio: generateAudio,
    watermark,
  };

  // camera_fixed は first_frame（image-to-video）では未サポートのため、テキストのみの場合のみ送信
  if (!scene.imgUrl) {
    reqBody.camera_fixed = cameraFixed;
  }

  try {
    const resp = await fetch(`${ARK_API_BASE}/contents/generations/tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(reqBody),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`BytePlus ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as { id?: string; message?: string };
    if (!data.id) throw new Error(data.message ?? "タスクIDが返されませんでした");

    await prisma.storyboardScene.update({
      where: { id: params.sceneId },
      data: {
        videoId: data.id,
        videoStatus: "queued",
        videoStatusYn: false,
        videoStartTime: new Date(),
      },
    });

    return NextResponse.json({ ok: true, taskId: data.id });
  } catch (e) {
    await logError("generate-video", `BytePlus create error: ${e}`, {
      userId: session.userId,
      detail: { storyboardId: params.id, sceneId: params.sceneId },
    });
    return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
  }
}
