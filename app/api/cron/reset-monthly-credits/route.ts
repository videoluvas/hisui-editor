export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPlanCreditsDefault } from "@/lib/plan-config";

const PAID_PLANS = new Set(["Pro", "Business"]);

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, message: "CRON_SECRET が未設定です" }, { status: 500 });
  }

  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const users = await prisma.user.findMany({
    where: {
      plan: { in: ["Pro", "Business"] },
      OR: [
        { creditsResetAt: null },
        { creditsResetAt: { lte: thirtyDaysAgo } },
      ],
    },
    select: { id: true, plan: true, email: true },
  });

  const now = new Date();
  const results: { email: string | null; plan: string | null; credits: number }[] = [];

  for (const u of users) {
    if (!PAID_PLANS.has(u.plan ?? "")) continue;
    const defaultAmt = await getPlanCreditsDefault(u.plan ?? "Free");
    await prisma.user.update({
      where: { id: u.id },
      data: { credits: defaultAmt, creditsResetAt: now },
    });
    prisma.logCredit.create({
      data: { userId: u.id, creditType: "grant", delta: defaultAmt, balanceAfter: defaultAmt, reason: "monthly_reset_cron" },
    }).catch(() => {});
    results.push({ email: u.email, plan: u.plan, credits: defaultAmt });
  }

  console.info(`[cron/reset-monthly-credits] reset ${results.length} users`, results.map(r => r.email));

  return NextResponse.json({ ok: true, count: results.length, resetAt: now, users: results });
}
