export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authorizeUrl, isConfigured, isProvider, newState } from "@/lib/auth.oauth";
import { safeNext } from "@/lib/auth.next";

// ポップアップで開き、Google / Microsoft のログイン画面へ送る
export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const p = params.provider;
  if (!isProvider(p) || !isConfigured(p)) return NextResponse.json({ ok: false, message: "このログイン方法は使えません" }, { status: 404 });

  const state = newState();
  const res = NextResponse.redirect(authorizeUrl(req, p, state));
  res.cookies.set("oauth_state", `${p}:${state}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/oauth",
    maxAge: 600,
  });
  // ポップアップでなく画面ごと移動した場合（ログイン画面など）は、終わったら next に戻る
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (next) res.cookies.set("oauth_next", next, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth/oauth", maxAge: 600 });
  return res;
}
