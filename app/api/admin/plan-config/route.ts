export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import type { PlanConfigRow } from "@/lib/email";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.length) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

const DEFAULTS = [
  { id: "Free", label: "無料プラン",  price_jpy: 0,    credit_img_max: 15,  credit_script_max: 5,   credit_video_max: 10, credit_audio_max: 20,  credit_bgm_max: 5,  free_model_img: "google-image-lite", free_model_video: "veo-3-lite", max_workspaces: 3  },
  { id: "Pro",  label: "Proプラン",   price_jpy: 9800, credit_img_max: 200, credit_script_max: 100, credit_video_max: 50, credit_audio_max: 100, credit_bgm_max: 20, free_model_img: "google-image-pro",  free_model_video: "veo-3",      max_workspaces: 20 },
];

export async function ensurePlanConfigsTable(): Promise<void> {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS plan_configs (
      id                 TEXT        PRIMARY KEY,
      label              TEXT        NOT NULL DEFAULT '',
      price_jpy          INT         NOT NULL DEFAULT 0,
      credit_img_max     INT         NOT NULL DEFAULT 15,
      credit_script_max  INT         NOT NULL DEFAULT 5,
      credit_video_max   INT         NOT NULL DEFAULT 10,
      credit_audio_max   INT         NOT NULL DEFAULT 20,
      credit_bgm_max     INT         NOT NULL DEFAULT 5,
      free_model_img     TEXT        NOT NULL DEFAULT 'google-image-lite',
      free_model_video   TEXT        NOT NULL DEFAULT 'veo-3-lite',
      max_workspaces     INT         NOT NULL DEFAULT 3,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  for (const d of DEFAULTS) {
    await prisma.$executeRaw`
      INSERT INTO plan_configs
        (id, label, price_jpy, credit_img_max, credit_script_max, credit_video_max, credit_audio_max, credit_bgm_max, free_model_img, free_model_video, max_workspaces)
      VALUES
        (${d.id}, ${d.label}, ${d.price_jpy}, ${d.credit_img_max}, ${d.credit_script_max}, ${d.credit_video_max}, ${d.credit_audio_max}, ${d.credit_bgm_max}, ${d.free_model_img}, ${d.free_model_video}, ${d.max_workspaces})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function getPlanConfig(planId: string): Promise<PlanConfigRow | null> {
  try {
    const rows = await prisma.$queryRaw<PlanConfigRow[]>`
      SELECT * FROM plan_configs WHERE id = ${planId} LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

const ALLOWED_FIELDS = new Set([
  "label", "price_jpy",
  "credit_img_max", "credit_script_max", "credit_video_max", "credit_audio_max", "credit_bgm_max",
  "free_model_img", "free_model_video", "max_workspaces",
]);

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  await ensurePlanConfigsTable();
  const configs = await prisma.$queryRaw<PlanConfigRow[]>`SELECT * FROM plan_configs ORDER BY price_jpy ASC`;
  return NextResponse.json({ ok: true, configs });
}

export async function PATCH(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { id?: string; field?: string; value?: string | number };
  if (!body.id || !body.field || !ALLOWED_FIELDS.has(body.field)) {
    return NextResponse.json({ ok: false, message: "不正なリクエスト" }, { status: 400 });
  }

  await prisma.$executeRawUnsafe(
    `UPDATE plan_configs SET "${body.field}" = $1, updated_at = NOW() WHERE id = $2`,
    body.value,
    body.id,
  );

  const configs = await prisma.$queryRaw<PlanConfigRow[]>`SELECT * FROM plan_configs ORDER BY price_jpy ASC`;
  return NextResponse.json({ ok: true, configs });
}
