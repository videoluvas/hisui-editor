export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        iconUrl: true,
        credits: true,
      },
    });
    if (!dbUser) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

    const [creditLogs, checkoutLogs, errorLogs, workspaceConsumption] = await Promise.all([
      prisma.logCredit.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 60,
      }).catch(() => []),
      prisma.logCheckout.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }).catch(() => []),
      prisma.logError.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 40,
      }).catch(() => []),
      prisma.$queryRaw<Array<{ id: string; name: string; consumed: number }>>`
        SELECT w.id, w.name, COALESCE(SUM(ABS(lc.delta)), 0)::int AS consumed
        FROM workspaces w
        LEFT JOIN logs_credit lc
          ON lc.workspace_id = w.id AND lc.delta < 0
        WHERE w.user_id = ${session.userId}::uuid
        GROUP BY w.id, w.name
        ORDER BY consumed DESC
      `.catch(() => []),
    ]);

    return NextResponse.json({
      ok: true,
      user: dbUser,
      creditLogs,
      checkoutLogs,
      errorLogs,
      workspaceConsumption,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[user/dashboard GET]", msg);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
