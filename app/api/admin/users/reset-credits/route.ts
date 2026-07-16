export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { getPlanCreditsDefault } from "@/lib/plan-config";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.length) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

const PAID_PLANS = new Set(["Pro", "Business"]);

// POST /api/admin/users/reset-credits
// body: { userId?: string }  — 省略時は期限切れユーザー全員をリセット
export async function POST(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({})) as { userId?: string };

  if (body.userId) {
    // 個別リセット
    const user = await prisma.user.findUnique({
      where: { id: body.userId },
      select: { id: true, plan: true },
    });
    if (!user) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

    const defaultAmt = await getPlanCreditsDefault(user.plan ?? "Free");
    const now = new Date();
    await prisma.user.update({
      where: { id: body.userId },
      data: { credits: defaultAmt, creditsResetAt: now },
    });
    prisma.logCredit.create({
      data: { userId: body.userId, creditType: "grant", delta: defaultAmt, balanceAfter: defaultAmt, reason: "monthly_reset" },
    }).catch(() => {});

    return NextResponse.json({ ok: true, count: 1, resetAt: now });
  }

  // 全員リセット（30日以上経過した有料プランユーザー）
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      plan: { in: ["Pro", "Business"] },
      OR: [
        { creditsResetAt: null },
        { creditsResetAt: { lte: thirtyDaysAgo } },
      ],
    },
    select: { id: true, plan: true },
  });

  const now = new Date();
  let count = 0;
  for (const u of users) {
    if (!PAID_PLANS.has(u.plan ?? "")) continue;
    const defaultAmt = await getPlanCreditsDefault(u.plan ?? "Free");
    await prisma.user.update({
      where: { id: u.id },
      data: { credits: defaultAmt, creditsResetAt: now },
    });
    prisma.logCredit.create({
      data: { userId: u.id, creditType: "grant", delta: defaultAmt, balanceAfter: defaultAmt, reason: "monthly_reset" },
    }).catch(() => {});
    count++;
  }

  return NextResponse.json({ ok: true, count, resetAt: now });
}
