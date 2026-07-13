export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const level  = searchParams.get("level")  ?? "";
  const source = searchParams.get("source") ?? "";
  const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit")  ?? 50)));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));

  const where = {
    ...(level  ? { level }  : {}),
    ...(source ? { source } : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.logError.count({ where }),
    prisma.logError.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
  ]);

  // userIds からメール一括取得
  const userIds = [...new Set(logs.map((l) => l.userId).filter((id): id is string => !!id))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true } })
    : [];
  const emailMap = Object.fromEntries(users.map((u) => [u.id, u.email]));

  return NextResponse.json({
    ok: true,
    total,
    logs: logs.map((l) => ({
      ...l,
      userEmail: l.userId ? (emailMap[l.userId] ?? null) : null,
    })),
  });
}
