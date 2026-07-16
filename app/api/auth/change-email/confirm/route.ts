export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSessionToken } from "@/lib/session.utils";

type TokenRow = { id: string; user_id: string; new_email: string; expires_at: Date; used_at: Date | null };

export async function GET(req: NextRequest) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  try {
    const token = req.nextUrl.searchParams.get("token") ?? "";
    if (!token) return NextResponse.redirect(`${appUrl}/?emailChange=invalid`);

    const tokenHash = hashSessionToken(token);
    const rows = await prisma.$queryRaw<TokenRow[]>`
      SELECT id, user_id, new_email, expires_at, used_at
      FROM "email_change_tokens"
      WHERE token_hash = ${tokenHash}
      LIMIT 1
    `;
    const row = rows[0];

    if (!row || row.used_at || new Date(row.expires_at) < new Date())
      return NextResponse.redirect(`${appUrl}/?emailChange=invalid`);

    await prisma.$executeRaw`
      UPDATE "users" SET email = ${row.new_email}, updated_at = NOW() WHERE id = ${row.user_id}
    `;
    await prisma.$executeRaw`
      UPDATE "email_change_tokens" SET used_at = NOW() WHERE id = ${row.id}
    `;

    return NextResponse.redirect(`${appUrl}/?emailChange=success`);
  } catch (error) {
    console.error("GET /api/auth/change-email/confirm error:", error);
    const appUrl2 = process.env.APP_URL ?? "http://localhost:3000";
    return NextResponse.redirect(`${appUrl2}/?emailChange=error`);
  }
}
