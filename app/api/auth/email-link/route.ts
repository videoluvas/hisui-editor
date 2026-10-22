export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createLoginToken } from "@/lib/auth.emailLink";
import { requestOrigin } from "@/lib/auth.oauth";
import { sendLoginLinkEmail } from "@/lib/email";
import { logError } from "@/lib/log.error";
import { safeNext } from "@/lib/auth.next";
import { LIMITS, clientIp, guardAuth } from "@/lib/auth.guard";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ログイン用リンクをメールで送る（アカウントがなければ、リンクを開いたときに登録される）
export async function POST(req: NextRequest) {
  if (!process.env.AUTH_LINK_SECRET || !process.env.RESEND_API_KEY)
    return NextResponse.json({ ok: false, message: "このログイン方法は使えません" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, message: "メールアドレスを確認してください" }, { status: 400 });

  const blocked = await guardAuth(req, body.turnstileToken, [
    { key: `link:email:${email}`, ...LIMITS.emailLinkPerEmail },
    { key: `link:ip:${clientIp(req)}`, ...LIMITS.emailLinkPerIp },
  ]);
  if (blocked) return blocked;

  try {
    const next = safeNext(body.next);
    const link = `${requestOrigin(req)}/api/auth/email-link/verify?t=${encodeURIComponent(createLoginToken(email))}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
    await sendLoginLinkEmail(email, link);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await logError("auth", `ログインリンクの送信に失敗: ${e}`, { level: "warn" });
    return NextResponse.json({ ok: false, message: "メールを送信できませんでした。時間をおいてお試しください" }, { status: 500 });
  }
}
