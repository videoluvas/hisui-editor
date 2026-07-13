export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth.password";
import { generateSessionToken, hashSessionToken, getSessionExpiresAt } from "@/lib/session.utils";
import { logError } from "@/lib/log.error";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  icon_url: string | null;
  password_hash: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "メールアドレスとパスワードを入力してください" }, { status: 400 });
    }

    // password_hash はまだ Prisma 型に反映されていないため raw SQL で取得する
    const rows = await prisma.$queryRaw<UserRow[]>`
      SELECT id, name, email, plan, icon_url, password_hash
      FROM "users"
      WHERE email = ${email}
      LIMIT 1
    `;
    const user = rows[0] ?? null;

    if (!user || !user.password_hash) {
      return NextResponse.json({ ok: false, message: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      await logError("auth", `ログイン失敗: パスワード不一致 (${email})`, { level: "warn", detail: { email } });
      return NextResponse.json({ ok: false, message: "メールアドレスまたはパスワードが正しくありません" }, { status: 401 });
    }

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = getSessionExpiresAt(30);

    await prisma.session.create({
      data: { userId: user.id, sessionTokenHash, expiresAt, lastAccessedAt: new Date() },
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, iconUrl: user.icon_url },
    });
    response.cookies.set("session_token", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });
    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    await logError("auth", `ログインサーバーエラー: ${error}`, { detail: { error: String(error) } });
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
