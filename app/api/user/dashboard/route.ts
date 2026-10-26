export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { getPlanUsage } from "@/lib/plan-usage";

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

    const [usage, creditLogs, checkoutLogs, errorLogs, workspaceConsumption, importJobs, outputLogs] = await Promise.all([
      getPlanUsage(session.userId),
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
      prisma.importJob.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, status: true, message: true, options: true, projectId: true, createdAt: true },
      }).catch(() => []),
      prisma.logOutput.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: { id: true, status: true, outputUrl: true, durationSec: true, sandbox: true, completedAt: true, createdAt: true, project: { select: { title: true } } },
      }).catch(() => []),
    ]);

    const projectIds = [...new Set(importJobs.map((j) => j.projectId).filter((id): id is string => !!id))];
    const titles = projectIds.length > 0
      ? Object.fromEntries((await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, title: true } }).catch(() => [])).map((p) => [p.id, p.title]))
      : {};

    return NextResponse.json({
      ok: true,
      user: dbUser,
      usage,
      creditLogs,
      checkoutLogs,
      errorLogs,
      workspaceConsumption,
      importLogs: importJobs.map((j) => {
        const o = (j.options ?? {}) as { title?: string; narration?: { voice?: string } };
        return {
          id: j.id,
          status: j.status,
          message: j.message,
          title: (j.projectId && titles[j.projectId]) || o.title || null,
          narration: !!o.narration,
          createdAt: j.createdAt,
        };
      }),
      outputLogs: outputLogs.map(({ project, ...o }) => ({ ...o, title: project?.title ?? null })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[user/dashboard GET]", msg);
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
