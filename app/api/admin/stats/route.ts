export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7);

  const [totalUsers, errorsToday, errors7d, latestError, errorsBySource] = await Promise.all([
    prisma.user.count(),
    prisma.logError.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.logError.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.logError.findFirst({ orderBy: { createdAt: "desc" }, select: { message: true, source: true, level: true, createdAt: true } }),
    prisma.logError.groupBy({
      by: ["source"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    totalUsers,
    errorsToday,
    errors7d,
    latestError,
    errorsBySource: errorsBySource.map((r) => ({ source: r.source, count: r._count.id })),
  });
}
