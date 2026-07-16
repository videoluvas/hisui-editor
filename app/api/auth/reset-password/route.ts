export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashSessionToken } from "@/lib/session.utils";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ ok: false, message: "メールアドレスを入力してください" }, { status: 400 });

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "users" WHERE email = ${email} LIMIT 1
    `;
    const user = rows[0];

    if (user) {
      const token = generateSessionToken();
      const tokenHash = hashSessionToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.$executeRaw`
        INSERT INTO "password_reset_tokens" (id, user_id, token_hash, expires_at, created_at)
        VALUES (gen_random_uuid(), ${user.id}, ${tokenHash}, ${expiresAt}, NOW())
      `;

      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
