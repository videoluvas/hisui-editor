export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { verifyLoginToken } from "@/lib/auth.emailLink";
import { requestOrigin } from "@/lib/auth.oauth";
import { attachSession, findOrCreateUserByEmail } from "@/lib/auth.signup";
import { safeNext } from "@/lib/auth.next";

// メールのリンクを開いたとき：ログイン（なければ登録）して完了画面へ
export async function GET(req: NextRequest) {
  const origin = requestOrigin(req);
  const email = verifyLoginToken(req.nextUrl.searchParams.get("t") ?? "");
  if (!email) return NextResponse.redirect(`${origin}/auth/linked?error=1`);

  const { user } = await findOrCreateUserByEmail(email);
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  return attachSession(NextResponse.redirect(`${origin}/auth/linked${next ? `?next=${encodeURIComponent(next)}` : ""}`), user.id);
}
