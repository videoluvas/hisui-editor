export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { OUTPUT_URL_TTL_MS, fetchRenderStatus, outputExpiresAt } from "@/lib/export.render";

// プロジェクトの書き出し履歴（新しい順）。途中のものは書き出しサーバーに状態を聞き直す
export async function GET(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const projectId = req.nextUrl.searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ ok: false, message: "projectIdが必要です" }, { status: 400 });

    const logs = await prisma.logOutput.findMany({
      where: { userId: session.userId, projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const items = await Promise.all(logs.map(async (log) => {
      let { status, outputUrl, completedAt } = log;
      const fresh = Date.now() - log.createdAt.getTime() < OUTPUT_URL_TTL_MS;
      if (status !== "done" && status !== "failed" && log.renderId && fresh) {
        const r = await fetchRenderStatus(session.userId, log.renderId, log.sandbox).catch(() => null);
        if (r) {
          status = r.status;
          if (r.status === "done" || r.status === "failed") { outputUrl = r.url; completedAt = new Date(); }
        }
      }
      if (status !== "done" && status !== "failed" && !fresh) status = "failed";
      const expiresAt = status === "done" ? outputExpiresAt({ completedAt, createdAt: log.createdAt }) : null;
      return {
        id: log.id, renderId: log.renderId, status, sandbox: log.sandbox, createdAt: log.createdAt,
        expiresAt, available: !!(outputUrl && expiresAt && expiresAt.getTime() > Date.now()),
      };
    }));

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("GET /api/export/history error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
