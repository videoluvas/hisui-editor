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

    const res = await fetch(`${process.env.SHOTSTACK_API_URL}/render/${renderId}`, {
      headers: { "x-api-key": process.env.SHOTSTACK_API_KEY! },
    });

    const data = await res.json();
    const { status, url } = data.response;

    return NextResponse.json({ ok: true, status, url: url ?? null });
  } catch (error) {
    console.error("GET /api/export/status error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}