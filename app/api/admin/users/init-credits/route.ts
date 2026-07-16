export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
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

// credits=0 のユーザーをプランデフォルトに初期化
export async function POST() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const users = await prisma.user.findMany({
    where: { credits: 0 },
    select: { id: true, plan: true },
  });

  let count = 0;
  for (const u of users) {
    const amount = await getPlanCreditsDefault(u.plan ?? "Free");
    await prisma.user.update({ where: { id: u.id }, data: { credits: amount } });
    count++;
  }

  return NextResponse.json({ ok: true, count });
}
