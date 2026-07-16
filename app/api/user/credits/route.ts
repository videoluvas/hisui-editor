export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { planDefaultCredits } from "@/lib/credits";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const user = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { credits: true, plan: true },
  });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });

  let { credits } = user;
  if (credits === 0) {
    const hasLog = await prisma.logCredit.findFirst({ where: { userId: session.userId } }).catch(() => null);
    if (!hasLog) {
      credits = planDefaultCredits(user.plan);
      await prisma.user.update({ where: { id: session.userId }, data: { credits } }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, credits });
}
