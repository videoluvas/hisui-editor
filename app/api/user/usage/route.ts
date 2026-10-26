export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { getPlanUsage } from "@/lib/plan-usage";

// プランの使用量（無料の残り回数・スタンダードの今月の残り）
export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
  const usage = await getPlanUsage(session.userId);
  if (!usage) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });
  return NextResponse.json({ ok: true, usage });
}
