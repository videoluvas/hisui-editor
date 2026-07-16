export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import type { PlanConfigRow } from "@/lib/email";
import { ensurePlanConfigsTable } from "@/lib/plan-config";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.length) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

const ALLOWED_FIELDS = new Set([
  "label", "price_jpy", "credits_default",
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
