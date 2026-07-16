export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/session.utils";
import { hashPassword } from "@/lib/auth.password";

type TokenRow = { id: string; user_id: string; expires_at: Date; used_at: Date | null };

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = String(body.token ?? "").trim();
    const newPassword = String(body.newPassword ?? "");

    if (!token) return NextResponse.json({ ok: false, message: "トークンが無効です" }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ ok: false, message: "パスワードは8文字以上で入力してください" }, { status: 400 });

    const tokenHash = hashSessionToken(token);
    const rows = await prisma.$queryRaw<TokenRow[]>`
      SELECT id, user_id, expires_at, used_at
      FROM "password_reset_tokens"
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;
    const row = rows[0];

    if (!row) return NextResponse.json({ ok: false, message: "リンクが無効または期限切れです" }, { status: 400 });
    if (row.used_at) return NextResponse.json({ ok: false, message: "このリンクはすでに使用されました" }, { status: 400 });
    if (new Date(row.expires_at) < new Date()) return NextResponse.json({ ok: false, message: "リンクの有効期限が切れています" }, { status: 400 });

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      const affected = await tx.$executeRaw`
        UPDATE "password_reset_tokens" SET used_at = NOW() WHERE id = ${row.id} AND used_at IS NULL
      `;
      if (affected === 0) throw new Error("TOKEN_ALREADY_USED");
      await tx.$executeRaw`
        UPDATE "users" SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${row.user_id}
      `;
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "TOKEN_ALREADY_USED") {
      return NextResponse.json({ ok: false, message: "このリンクはすでに使用されました" }, { status: 400 });
    }
    console.error("POST /api/auth/reset-password/confirm error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
