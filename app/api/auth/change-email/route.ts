export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { generateSessionToken, hashSessionToken } from "@/lib/session.utils";
import { sendEmailChangeEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const body = await req.json();
    const newEmail = String(body.newEmail ?? "").trim().toLowerCase();
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      return NextResponse.json({ ok: false, message: "有効なメールアドレスを入力してください" }, { status: 400 });

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "users" WHERE email = ${newEmail} LIMIT 1
    `;
    if (existing.length > 0)
      return NextResponse.json({ ok: false, message: "このメールアドレスはすでに使用されています" }, { status: 400 });

    const token = generateSessionToken();
    const tokenHash = hashSessionToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.$executeRaw`
      INSERT INTO "email_change_tokens" (id, user_id, token_hash, new_email, expires_at, created_at)
      VALUES (gen_random_uuid(), ${session.user.id}, ${tokenHash}, ${newEmail}, ${expiresAt}, NOW())
    `;

    await sendEmailChangeEmail(newEmail, token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/change-email error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
