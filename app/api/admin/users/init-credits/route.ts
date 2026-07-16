export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.length) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

const PLAN_DEFAULT: Record<string, number> = {
  Free:     1_000,
  Pro:    500_000,
  Business: 150_000,
};

// 全ユーザーのクレジットをプランデフォルトに上書き（credits=0 のみ対象）
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
    const amount = PLAN_DEFAULT[u.plan ?? "Free"] ?? 1_000;
    await prisma.user.update({ where: { id: u.id }, data: { credits: amount } });
    count++;
  }

  return NextResponse.json({ ok: true, count });
}
