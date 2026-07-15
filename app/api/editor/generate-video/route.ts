export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import { checkFreeAccess } from "@/lib/free-limit";


const ARK_API_BASE   = "https://ark.ap-southeast.bytepluses.com/api/v3";
const SEEDANCE_MODEL = "seedance-1-5-pro-251215";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";

const VEO_MODEL_IDS: Record<string, string> = {
  "veo-3":      process.env.VEO_MODEL      ?? "veo-3.1-generate-preview",
  "veo-3-lite": process.env.VEO_LITE_MODEL ?? "veo-3.1-lite-generate-preview",
};

const VEO_LITE_MAX_DURATION = 8;
const VEO_LITE_RESOLUTIONS  = new Set(["720p", "1080p"]);
const VEO_LITE_RATIOS       = new Set(["16:9", "9:16"]);

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
    vidCommonRules?: string;
    vidNegativePrompt?: string;
  };

  const basePrompt = (body.prompt ?? "").trim();
  if (!basePrompt) return NextResponse.json({ ok: false, message: "プロンプトを入力してください" }, { status: 400 });
  const rules = body.vidCommonRules?.trim();
  const neg   = body.vidNegativePrompt?.trim();
  const prompt = [basePrompt, rules, neg ? `以下の要素は含めないでください: ${neg}` : ""].filter(Boolean).join(" ");

  const { ok: accessOk, message: accessMsg, effectiveModel: videoModel } = await checkFreeAccess(session.userId, "video", body.videoModel ?? "seedance-1-5-pro");
  if (!accessOk) return NextResponse.json({ ok: false, message: accessMsg }, { status: 402 });

  const {
    resolution    = "720p",
    ratio         = "16:9",
    duration      = 5,
    generateAudio = false,
    watermark     = false,
    cameraFixed   = false,
  } = body;

  const userId = session.userId;

  // ── Google Veo ───────────────────────────────────────────────────────────────
  if (videoModel === "veo-3" || videoModel === "veo-3-lite") {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    const modelId = VEO_MODEL_IDS[videoModel];
    const clampedResolution = videoModel === "veo-3-lite" && !VEO_LITE_RESOLUTIONS.has(resolution) ? "720p" : resolution;
    const clampedRatio      = videoModel === "veo-3-lite" && !VEO_LITE_RATIOS.has(ratio) ? "16:9" : ratio;
    const rawDuration = videoModel === "veo-3-lite" ? Math.min(duration, VEO_LITE_MAX_DURATION) : Math.max(4, Math.min(8, duration));
    const allowedDurations = [4, 6, 8] as const;
    const clampedDuration  = allowedDurations.reduce((prev, curr) =>
      Math.abs(curr - rawDuration) < Math.abs(prev - rawDuration) ? curr : prev
    );

    const veoParams: Record<string, unknown> = {
      aspectRatio: clampedRatio,
      resolution: clampedResolution,
      durationSeconds: clampedDuration,
      sampleCount: 1,
    };
    if (videoModel === "veo-3") veoParams.generateAudio = generateAudio === true;

    const veoBody = { instances: [{ prompt }], parameters: veoParams };

    try {
      const resp = await fetch(`${GOOGLE_AI_BASE}/models/${modelId}:predictLongRunning`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": googleApiKey },
        body: JSON.stringify(veoBody),
      });
      if (!resp.ok) throw new Error(`Google Veo ${resp.status}: ${await resp.text()}`);
      const data = await resp.json() as { name?: string; error?: { message: string } };
      if (!data.name) throw new Error(data.error?.message ?? "オペレーション名が返されませんでした");

      await logGeneration(userId, "video");
      return NextResponse.json({ ok: true, taskId: `veo:${data.name}`, provider: videoModel });
    } catch (e) {
      await logError("editor-generate-video", `Veo create error: ${e}`, { userId, detail: {} });
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
    duration: Math.max(4, Math.min(12, Number(duration))),
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

    await logGeneration(userId, "video");
    return NextResponse.json({ ok: true, taskId: data.id, provider: "seedance" });
  } catch (e) {
    await logError("editor-generate-video", `BytePlus create error: ${e}`, { userId, detail: {} });
    return NextResponse.json({ ok: false, message: `動画生成タスクの作成に失敗しました: ${e}` }, { status: 500 });
  }
}
