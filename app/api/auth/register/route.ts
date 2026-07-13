export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth.password";
import { generateSessionToken, hashSessionToken, getSessionExpiresAt } from "@/lib/session.utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const name = String(body.name ?? "").trim();

    if (!email || !password) {
      return NextResponse.json({ ok: false, message: "メールアドレスとパスワードは必須です" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    // password_hash はまだ Prisma 型に反映されていないため raw SQL で書き込む
    const user = await prisma.user.create({
      data: { email, name: name || null },
    });
    await prisma.$executeRaw`UPDATE "users" SET "password_hash" = ${passwordHash} WHERE "id" = ${user.id}`;

    const sessionToken = generateSessionToken();
    const sessionTokenHash = hashSessionToken(sessionToken);
    const expiresAt = getSessionExpiresAt(30);

    await prisma.session.create({
      data: { userId: user.id, sessionTokenHash, expiresAt, lastAccessedAt: new Date() },
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, iconUrl: user.iconUrl },
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
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
