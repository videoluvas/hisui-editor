export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

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
    const { status, url } = data.response;

    return NextResponse.json({ ok: true, status, url: url ?? null });
  } catch (error) {
    console.error("GET /api/export/status error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
