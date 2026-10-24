export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const renderId = req.nextUrl.searchParams.get("renderId");
    if (!renderId) return NextResponse.json({ ok: false, message: "renderIdが必要です" }, { status: 400 });

    // sandbox=false のときのみ本番APIを使う（デフォルトはサンドボックス）
    const useSandbox = req.nextUrl.searchParams.get("sandbox") !== "false";

    const apiKey = useSandbox
      ? process.env.SHOTSTACK_API_KEY!
      : (process.env.SHOTSTACK_PROD_API_KEY ?? process.env.SHOTSTACK_API_KEY!);
    const apiUrl = useSandbox
      ? process.env.SHOTSTACK_API_URL!
      : (process.env.SHOTSTACK_PROD_API_URL ?? process.env.SHOTSTACK_API_URL!);

    const res = await fetch(`${apiUrl}/render/${renderId}`, {
      headers: { "x-api-key": apiKey },
    });

    const data = await res.json();
    const { status, url, error } = data.response;
    // 失敗の理由を記録しておき、問い合わせの受付番号（renderId）から追えるようにする
    if (status === "done" || status === "failed") {
      await prisma.logOutput.updateMany({
        where: { renderId, userId: session.userId, status: { notIn: ["done", "failed"] } },
        data: { status, outputUrl: url ?? null },
      }).catch((e) => console.error("logs_output update failed:", e));
    }
    if (status === "failed") await logError("export-render", error ?? "render failed", { userId: session.userId, detail: { renderId, sandbox: useSandbox } });

    return NextResponse.json({ ok: true, status, url: url ?? null, error: error ?? null });
  } catch (error) {
    console.error("GET /api/export/status error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
