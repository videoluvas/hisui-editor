export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth.password";
import { attachSession, createUserWithWorkspace } from "@/lib/auth.signup";
import { LIMITS, clientIp, guardAuth } from "@/lib/auth.guard";

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

    const blocked = await guardAuth(request, body.turnstileToken, [{ key: `register:ip:${clientIp(request)}`, ...LIMITS.registerPerIp }]);
    if (blocked) return blocked;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ ok: false, message: "このメールアドレスは既に登録されています" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUserWithWorkspace(email, name);
    // password_hash はまだ Prisma 型に反映されていないため raw SQL で書き込む
    await prisma.$executeRaw`UPDATE "users" SET "password_hash" = ${passwordHash} WHERE "id" = ${user.id}`;

    return attachSession(NextResponse.json({
      ok: true,
      user: { id: user.id, name: user.name, email: user.email, plan: user.plan, iconUrl: user.iconUrl },
    }), user.id);
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
