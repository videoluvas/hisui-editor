export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { invalidateModelCache } from "@/lib/model-config";

const MODEL_DEFINITIONS = [
  { modelId: "google-image-lite",   modelType: "image",  modelLabel: "Google Image Lite" },
  { modelId: "google-image-pro",    modelType: "image",  modelLabel: "Google Image Pro" },
  { modelId: "seedream-5-0-pro",    modelType: "image",  modelLabel: "Seedream 5.0 Pro" },
  { modelId: "reve-1",              modelType: "image",  modelLabel: "Reve AI" },
  { modelId: "gpt-image-2-high",    modelType: "image",  modelLabel: "GPT Image 2 (High)" },
  { modelId: "veo-3-lite",          modelType: "video",  modelLabel: "Veo 3 Lite" },
  { modelId: "veo-3",               modelType: "video",  modelLabel: "Veo 3" },
  { modelId: "kling-v2",            modelType: "video",  modelLabel: "Kling 2.0" },
  { modelId: "kling-v2-master",     modelType: "video",  modelLabel: "Kling 2.0 Master" },
  { modelId: "kling-v3",            modelType: "video",  modelLabel: "Kling 3.0" },
  { modelId: "kling-v3-turbo",      modelType: "video",  modelLabel: "Kling 3.0 Turbo" },
  { modelId: "gemini-tts-high",     modelType: "tts",    modelLabel: "Gemini TTS High" },
  { modelId: "lyria-2",             modelType: "bgm",    modelLabel: "Lyria 2" },
  { modelId: "lyria-3-pro-preview", modelType: "bgm",    modelLabel: "Lyria 3 Pro" },
  { modelId: "claude-haiku-4-5",    modelType: "script", modelLabel: "Claude Haiku 4.5" },
  { modelId: "claude-sonnet-4-6",   modelType: "script", modelLabel: "Claude Sonnet 4.6" },
  { modelId: "claude-opus-4-7",     modelType: "script", modelLabel: "Claude Opus 4.7" },
];

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const rows = await prisma.modelConfig.findMany();
  const rowMap = Object.fromEntries(rows.map((r) => [r.modelId, r.availability]));

  const configs = MODEL_DEFINITIONS.map((def) => ({
    ...def,
    availability: (rowMap[def.modelId] ?? "paid") as "free" | "paid" | "suspended",
  }));

  return NextResponse.json({ ok: true, configs });
}

export async function PATCH(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await request.json().catch(() => ({})) as { modelId?: string; availability?: string };
  const { modelId, availability } = body;

  if (!modelId || !["free", "paid", "suspended"].includes(availability ?? "")) {
    return NextResponse.json({ ok: false, message: "不正なリクエストです" }, { status: 400 });
  }

  const def = MODEL_DEFINITIONS.find((d) => d.modelId === modelId);
  if (!def) return NextResponse.json({ ok: false, message: "不明なモデルIDです" }, { status: 400 });

  await prisma.modelConfig.upsert({
    where:  { modelId },
    update: { availability: availability!, updatedAt: new Date() },
    create: { modelId, modelType: def.modelType, modelLabel: def.modelLabel, availability: availability!, updatedAt: new Date() },
  });

  invalidateModelCache();

  const rows = await prisma.modelConfig.findMany();
  const rowMap = Object.fromEntries(rows.map((r) => [r.modelId, r.availability]));
  const configs = MODEL_DEFINITIONS.map((d) => ({
    ...d,
    availability: (rowMap[d.modelId] ?? "paid") as "free" | "paid" | "suspended",
  }));

  return NextResponse.json({ ok: true, configs });
}
