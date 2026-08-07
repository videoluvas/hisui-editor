export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
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

const VEO_LITE_RESOLUTIONS = new Set(["720p", "1080p"]);
const VEO_FULL_RESOLUTIONS = new Set(["720p", "1080p", "4k"]);
const VEO_VALID_RATIOS     = new Set(["16:9", "9:16"]);

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    prompt?: string;
    videoModel?: string;
    resolution?: string;
    ratio?: string;
    duration?: number;
    generateAudio?: boolean;
    watermark?: boolean;
    cameraFixed?: boolean;
    seed?: number;
    vidCommonRules?: string;
    vidNegativePrompt?: string;
  };

  const basePrompt = (body.prompt ?? "").trim();
  if (!basePrompt) return NextResponse.json({ ok: false, message: "プロンプトを入力してください" }, { status: 400 });

  const rules = body.vidCommonRules?.trim();
  const neg   = body.vidNegativePrompt?.trim();
  const prompt = [basePrompt, rules, neg ? `以下の要素は含めないでください: ${neg}` : ""].filter(Boolean).join(" ");

  const videoModel    = body.videoModel ?? "veo-3-lite";
  const isVeoModel    = videoModel === "veo-3" || videoModel === "veo-3-lite";
  const isKlingModel  = videoModel.startsWith("kling-");
  const isKlingV3     = videoModel === "kling-v3" || videoModel === "kling-v3-turbo";

  const access = await checkModelAccess(videoModel, session.user.plan ?? null);
  if (!access.ok) return NextResponse.json({ ok: false, message: access.message }, { status: access.status ?? 403 });

  const klingV3Duration = isKlingV3 ? (body.duration && body.duration >= 8 ? 10 : 5) : 1;
  const creditAction    = videoModelToAction(videoModel, (isVeoModel || (isKlingModel && !isKlingV3)) ? false : (body.generateAudio ?? false));
  const credit = await consumeCredits(session.userId, creditAction, null, klingV3Duration);
  if (!credit.ok) return NextResponse.json({ ok: false, message: credit.message }, { status: 402 });

  const {
    resolution    = "720p",
    ratio         = "16:9",
    duration      = 8,
    generateAudio = false,
    watermark     = false,
    cameraFixed   = false,
    seed          = 0,
  } = body;

  const userId = session.userId;

  // ── Google Veo ───────────────────────────────────────────────────────────────
  if (isVeoModel) {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    const modelId = VEO_MODEL_IDS[videoModel];
    const allowedRes = videoModel === "veo-3-lite" ? VEO_LITE_RESOLUTIONS : VEO_FULL_RESOLUTIONS;
    const clampedResolution = allowedRes.has(resolution) ? resolution : "720p";

    const validRatio = VEO_VALID_RATIOS.has(ratio) ? ratio : null;

    const needsMaxDuration = clampedResolution === "1080p" || clampedResolution === "4k";
    const veoAllowedDurations = [4, 6, 8] as const;
    const clampedDuration: number | null = duration === -1 ? null :
      needsMaxDuration ? 8 :
      veoAllowedDurations.reduce((prev, curr) =>
        Math.abs(curr - duration) < Math.abs(prev - duration) ? curr : prev
      );

    const veoParams: Record<string, unknown> = {
      resolution:       clampedResolution,
      sampleCount:      1,
      personGeneration: "allow_all",
    };
    if (validRatio !== null)      veoParams.aspectRatio     = validRatio;
    if (clampedDuration !== null) veoParams.durationSeconds = clampedDuration;
    if (seed && seed > 0)         veoParams.seed            = seed;

    const veoBody = { instances: [{ prompt }], parameters: veoParams };

    try {
      const resp = await fetch(`${GOOGLE_AI_BASE}/models/${modelId}:predictLongRunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": googleApiKey },
        body: JSON.stringify(veoBody),
      });
      if (!resp.ok) throw new Error(`Google Veo ${resp.status} (model: ${modelId}): ${await resp.text()}`);
      const data = await resp.json() as { name?: string; error?: { message: string } };
      if (!data.name) throw new Error(data.error?.message ?? "オペレーション名が返されませんでした");

      return NextResponse.json({ ok: true, taskId: `veo:${data.name}`, provider: videoModel });
    } catch (e) {
      await logError("editor-generate-video", `Veo create error: ${e}`, { userId, detail: {} });
      await refundCredits(userId, videoModelToAction(videoModel, false));
      return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
    }
  }

  // ── Kling AI ─────────────────────────────────────────────────────────────────
  if (isKlingModel) {
    const klingApiKey = process.env.KLING_API_KEY;
    if (!klingApiKey) return NextResponse.json({ ok: false, message: "KLING_API_KEY が設定されていません" }, { status: 500 });

    const KLING_MODEL_PATHS: Record<string, string> = {
      "kling-v2":        "kling-v2",
      "kling-v2-master": "kling-v2-master",
      "kling-v3":        "kling-3.0",
      "kling-v3-turbo":  "kling-3.0-turbo",
    };
    const modelPath = KLING_MODEL_PATHS[videoModel] ?? "kling-3.0";

    const contents: Record<string, unknown>[] = [{ type: "prompt", text: prompt }];
    const settings: Record<string, unknown> = { duration: duration >= 8 ? 10 : 5 };
    if (["16:9", "9:16", "1:1"].includes(ratio)) settings.aspect_ratio = ratio;
    if (videoModel === "kling-v3") settings.audio = generateAudio ? "native" : "off";

    const klingBody: Record<string, unknown> = { contents, settings };

    try {
      const resp = await fetch(`${KLING_API_BASE}/text-to-video/${modelPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${klingApiKey}` },
        body: JSON.stringify(klingBody),
      });
      if (!resp.ok) throw new Error(`Kling ${resp.status}: ${await resp.text()}`);
      const data = await resp.json() as { code: number; message: string; data?: { id?: string } };
      if (data.code !== 0 || !data.data?.id) throw new Error(data.message ?? "タスクIDが返されませんでした");

      return NextResponse.json({ ok: true, taskId: `kling:${data.data.id}`, provider: videoModel });
    } catch (e) {
      await logError("editor-generate-video", `Kling create error: ${e}`, { userId, detail: {} });
      await refundCredits(userId, creditAction, null, klingV3Duration);
      return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
    }
  }

  // ── BytePlus Seedance ────────────────────────────────────────────────────────
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, message: "ARK_API_KEY が設定されていません" }, { status: 500 });

  const reqBody: Record<string, unknown> = {
    model: SEEDANCE_MODEL,
    content: [{ type: "text", text: prompt }],
    resolution,
    ratio,
    duration: duration === -1 ? -1 : Math.max(4, Math.min(12, Number(duration))),
    generate_audio: generateAudio,
    watermark,
    camera_fixed: cameraFixed,
  };

  try {
    const resp = await fetch(`${ARK_API_BASE}/contents/generations/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(reqBody),
    });
    if (!resp.ok) throw new Error(`BytePlus ${resp.status}: ${await resp.text()}`);
    const data = await resp.json() as { id?: string; message?: string };
    if (!data.id) throw new Error(data.message ?? "タスクIDが返されませんでした");

    return NextResponse.json({ ok: true, taskId: data.id, provider: "seedance" });
  } catch (e) {
    await logError("editor-generate-video", `BytePlus create error: ${e}`, { userId, detail: {} });
    await refundCredits(userId, videoModelToAction(videoModel, body.generateAudio ?? false));
    return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
  }
}
