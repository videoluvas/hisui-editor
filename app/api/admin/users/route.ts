export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { grantCredits } from "@/lib/credits";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

// ── GET: ユーザー一覧 ──────────────────────────────────────────────────────────
export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      credits: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, users });
}

const PLAN_CREDIT_GRANT: Record<string, number> = {
  Pro:      500_000,
  Business: 150_000,
};

// ── PATCH: プラン・クレジット変更 ──────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    userId: string;
    plan?: string;
    grantCredits?: number;
  };

  if (!body.userId) return NextResponse.json({ ok: false, message: "userId が必要です" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, plan: true, credits: true },
  });
  if (!target) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  const planChanging = body.plan !== undefined && body.plan !== target.plan;
  if (planChanging) updateData.plan = body.plan;

  if (Object.keys(updateData).length === 0 && !body.grantCredits) {
    return NextResponse.json({ ok: false, message: "変更内容がありません" }, { status: 400 });
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.user.update({ where: { id: body.userId }, data: updateData });
  }

  if (planChanging && body.plan && PLAN_CREDIT_GRANT[body.plan]) {
    await grantCredits(body.userId, PLAN_CREDIT_GRANT[body.plan], `plan_upgrade_${body.plan.toLowerCase()}`);
  }

  if (body.grantCredits && body.grantCredits !== 0) {
    await grantCredits(body.userId, body.grantCredits, "admin_grant");
  }

  const updated = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { id: true, plan: true, credits: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}

// ── DELETE: ユーザー削除 ───────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const { userId } = await req.json().catch(() => ({})) as { userId?: string };
  if (!userId) return NextResponse.json({ ok: false, message: "userId が必要です" }, { status: 400 });

  if (userId === session.userId)
    return NextResponse.json({ ok: false, message: "自分自身は削除できません" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!target) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  await prisma.session.deleteMany({ where: { userId } });
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ ok: true });
}
