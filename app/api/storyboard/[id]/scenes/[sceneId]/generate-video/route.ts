export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { consumeCredits, refundCredits, videoModelToAction } from "@/lib/credits";
import { checkModelAccess } from "@/lib/model-config";


const ARK_API_BASE   = "https://ark.ap-southeast.bytepluses.com/api/v3";
const SEEDANCE_MODEL = "seedance-1-5-pro-251215";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const KLING_API_BASE = "https://api-singapore.klingai.com";

const VEO_MODEL_IDS: Record<string, string> = {
  "veo-3":      process.env.VEO_MODEL      ?? "veo-3.1-generate-preview",
  "veo-3-lite": process.env.VEO_LITE_MODEL ?? "veo-3.1-lite-generate-preview",
};

// Veo constraints
const VEO_LITE_RESOLUTIONS = new Set(["720p", "1080p"]);        // Lite は 4K 非対応
const VEO_FULL_RESOLUTIONS = new Set(["720p", "1080p", "4k"]);
const VEO_VALID_RATIOS     = new Set(["16:9", "9:16"]);         // 両モデル共通: 16:9 / 9:16 のみ有効

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
    klingMultiShot?: boolean;
    klingElements?: string[];
    klingCamHorizontal?: number;
    klingCamVertical?: number;
    klingCamPan?: number;
    klingCamTilt?: number;
    klingCamRoll?: number;
    klingCamZoom?: number;
    cameraFixed?: boolean;
    watermark?: boolean;
    // Veo 専用
    seed?: number;
    vidCommonRules?: string;
    vidNegativePrompt?: string;
  };

  const videoModel    = body.videoModel ?? "veo-3-lite";
  const workspaceId   = sb.workspaceId ?? null;
  const isVeoModel    = videoModel === "veo-3" || videoModel === "veo-3-lite";
  const isKlingModel  = videoModel.startsWith("kling-");
  const isKlingV3     = videoModel === "kling-v3" || videoModel === "kling-v3-turbo" || videoModel === "kling-v3-omni";

  const access = await checkModelAccess(videoModel, session.user.plan ?? null);
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status ?? 403 });

  const klingV3Duration = isKlingV3 ? Math.max(3, Math.min(15, Math.round(body.duration ?? 5))) : 1;
  const creditAction    = videoModelToAction(videoModel, (isVeoModel || (isKlingModel && !isKlingV3)) ? false : (body.generateAudio ?? false));
  const credit = await consumeCredits(session.userId, creditAction, workspaceId, klingV3Duration);
  if (!credit.ok) return NextResponse.json({ ok: false, message: credit.message }, { status: 402 });

  const {
    resolution     = "720p",
    ratio          = "16:9",
    duration       = 5,
    generateAudio  = false,
    klingMultiShot = false,
    klingElements  = [],
    klingCamHorizontal = 0,
    klingCamVertical   = 0,
    klingCamPan        = 0,
    klingCamTilt       = 0,
    klingCamRoll       = 0,
    klingCamZoom       = 0,
    cameraFixed        = false,
    watermark      = false,
    seed           = 0,
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

    // Veo constraints
    const allowedRes = videoModel === "veo-3-lite" ? VEO_LITE_RESOLUTIONS : VEO_FULL_RESOLUTIONS;
    const clampedResolution = allowedRes.has(resolution) ? resolution : "720p";
    const hasRefImage = !!scene.imgUrl;

    // aspectRatio: 16:9 / 9:16 のみ有効。"adaptive" その他は省略（API デフォルトに任せる）
    const validRatio = VEO_VALID_RATIOS.has(ratio) ? ratio : null;

    // durationSeconds: -1（auto）は省略。1080p/4k は8秒固定。それ以外は 4/6/8 に最近傍
    const needsMaxDuration = clampedResolution === "1080p" || clampedResolution === "4k";
    const veoAllowedDurations = [4, 6, 8] as const;
    const clampedDuration: number | null = duration === -1 ? null :
      needsMaxDuration ? 8 :
      veoAllowedDurations.reduce((prev, curr) =>
        Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
      );

    // personGeneration: I2V=allow_adult, T2V=allow_all（ユーザー選択なし）
    const veoPersonGeneration = hasRefImage ? "allow_adult" : "allow_all";

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
      resolution:       clampedResolution,
      sampleCount:      1,
      personGeneration: veoPersonGeneration,
    };
    if (validRatio !== null)       veoParams.aspectRatio    = validRatio;
    if (clampedDuration !== null)  veoParams.durationSeconds = clampedDuration;
    if (seed && seed > 0)          veoParams.seed           = seed;

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
      await refundCredits(session.userId, videoModelToAction(videoModel, false), workspaceId);
      return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
    }
  }

  // ── Kling AI ─────────────────────────────────────────────────────────────────
  if (isKlingModel) {
    const klingApiKey = process.env.KLING_API_KEY;
    if (!klingApiKey)
      return NextResponse.json({ ok: false, message: "KLING_API_KEY が設定されていません" }, { status: 500 });

    const KLING_MODEL_PATHS: Record<string, string> = {
      "kling-v2":        "kling-v2",
      "kling-v2-master": "kling-v2-master",
      "kling-v3":        "kling-3.0",
      "kling-v3-turbo":  "kling-3.0-turbo",
      "kling-v3-omni":   "kling-3.0-omni",
    };
    const modelPath   = KLING_MODEL_PATHS[videoModel] ?? "kling-3.0";
    const hasRefImage = !!scene.imgUrl;

    const isKlingOmni = videoModel === "kling-v3-omni";

    const klingDuration = isKlingV3
      ? Math.max(3, Math.min(15, Math.round(duration)))
      : (duration >= 8 ? 10 : 5);

    const contents: Record<string, unknown>[] = [
      { type: "prompt", text: instructions.trim() || "動画を生成してください" },
    ];
    if (hasRefImage) contents.push({ type: "first_frame", url: scene.imgUrl });
    // 3.0 / Omni: Element 参照
    const maxElements = isKlingOmni ? 7 : 3;
    const validElements = (klingElements ?? []).filter((u) => u.trim().startsWith("http")).slice(0, maxElements);
    for (const url of validElements) {
      contents.push({ type: "element", url: url.trim() });
    }

    const settings: Record<string, unknown> = { duration: klingDuration };
    if (!hasRefImage && ["16:9", "9:16", "1:1"].includes(ratio)) settings.aspect_ratio = ratio;
    if (isKlingV3 && (resolution === "1080p" || resolution === "4k")) settings.resolution = resolution;
    if (videoModel === "kling-v3" || isKlingOmni) settings.audio = generateAudio ? "native" : "off";

    // カメラ config（3.0 / Omni のみ）: camera_control はトップレベルフィールド
    const isKlingNonTurbo = videoModel === "kling-v3" || isKlingOmni;

    const klingBody: Record<string, unknown> = { contents, settings };
    if (isKlingV3) klingBody.multi_shot = klingMultiShot;
    if (isKlingNonTurbo) {
      const camCfg = {
        horizontal: Math.max(-10, Math.min(10, klingCamHorizontal)),
        vertical:   Math.max(-10, Math.min(10, klingCamVertical)),
        pan:        Math.max(-10, Math.min(10, klingCamPan)),
        tilt:       Math.max(-10, Math.min(10, klingCamTilt)),
        roll:       Math.max(-10, Math.min(10, klingCamRoll)),
        zoom:       Math.max(-10, Math.min(10, klingCamZoom)),
      };
      if (Object.values(camCfg).some(v => v !== 0)) {
        klingBody.camera_control = { type: "simple", config: camCfg };
      }
    }
    const klingEndpoint = isKlingOmni ? "omni-video" : (hasRefImage ? "image-to-video" : "text-to-video");

    console.log("[Kling storyboard] POST", `${KLING_API_BASE}/${klingEndpoint}/${modelPath}`, JSON.stringify(klingBody, null, 2));

    try {
      const resp = await fetch(`${KLING_API_BASE}/${klingEndpoint}/${modelPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${klingApiKey}` },
        body: JSON.stringify(klingBody),
      });
      if (!resp.ok) throw new Error(`Kling ${resp.status}: ${await resp.text()}`);
      const data = await resp.json() as { code: number; message: string; data?: { id?: string } };
      if (data.code !== 0 || !data.data?.id) throw new Error(data.message ?? "タスクIDが返されませんでした");

      const taskIdStored = `kling:${data.data.id}`;
      await prisma.storyboardScene.update({
        where: { id: params.sceneId },
        data: { videoId: taskIdStored, videoStatus: "queued", videoStatusYn: false, videoStartTime: new Date() },
      });

      return NextResponse.json({ ok: true, taskId: taskIdStored });
    } catch (e) {
      await logError("generate-video", `Kling create error: ${e}`, {
        userId: session.userId,
        detail: { storyboardId: params.id, sceneId: params.sceneId },
      });
      await refundCredits(session.userId, creditAction, workspaceId, klingV3Duration);
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
    await refundCredits(session.userId, videoModelToAction(videoModel, body.generateAudio ?? false), workspaceId);
    return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
  }
}
