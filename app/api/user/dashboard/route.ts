export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      iconUrl: true,
      creditImg: true,
      creditImgMax: true,
      creditScript: true,
      creditScriptMax: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  const [creditLogs, checkoutLogs, errorLogs] = await Promise.all([
    prisma.logCredit.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.logCheckout.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.logError.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({ ok: true, user, creditLogs, checkoutLogs, errorLogs });
}
