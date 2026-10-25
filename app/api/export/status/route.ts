export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { fetchRenderStatus } from "@/lib/export.render";

export async function GET(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const renderId = req.nextUrl.searchParams.get("renderId");
    if (!renderId) return NextResponse.json({ ok: false, message: "renderIdが必要です" }, { status: 400 });

    // どちらの書き出しサーバーを使ったかは記録から引く（記録がなければ sandbox パラメータ、既定はサンドボックス）
    const log = await prisma.logOutput.findFirst({ where: { renderId, userId: session.userId }, select: { id: true, sandbox: true } });
    const useSandbox = log ? log.sandbox : req.nextUrl.searchParams.get("sandbox") !== "false";

    const { status, url, error } = await fetchRenderStatus(session.userId, renderId, useSandbox);
    return NextResponse.json({ ok: true, status, url, error, logId: log?.id ?? null });
  } catch (error) {
    console.error("GET /api/export/status error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
