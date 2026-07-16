export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth.password";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      surname: true,
      email: true,
      phone: true,
      companyName: true,
      iconUrl: true,
      plan: true,
    },
  });
  if (!user) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  return NextResponse.json({ ok: true, user });
}

export async function PATCH(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    name?: string;
    surname?: string;
    phone?: string;
    companyName?: string;
    iconUrl?: string;
    newPassword?: string;
  };

  if (typeof body.newPassword === "string") {
    const pw = body.newPassword;
    if (pw.length < 8)
      return NextResponse.json({ ok: false, message: "パスワードは8文字以上で入力してください" }, { status: 400 });
    const passwordHash = await hashPassword(pw);
    await prisma.$executeRaw`
      UPDATE "users" SET password_hash = ${passwordHash}, updated_at = NOW() WHERE id = ${session.userId}
    `;
    return NextResponse.json({ ok: true });
  }

  const data: Record<string, string | null> = {};
  if (typeof body.name        === "string") data.name        = body.name.trim()        || null;
  if (typeof body.surname     === "string") data.surname     = body.surname.trim()     || null;
  if (typeof body.phone       === "string") data.phone       = body.phone.trim()       || null;
  if (typeof body.companyName === "string") data.companyName = body.companyName.trim() || null;
  if (typeof body.iconUrl     === "string") data.iconUrl     = body.iconUrl.trim()     || null;

  if (Object.keys(data).length === 0)
    return NextResponse.json({ ok: false, message: "更新するフィールドがありません" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id: session.userId },
    data,
    select: { id: true, name: true, surname: true, email: true, phone: true, companyName: true, iconUrl: true, plan: true },
  });

  return NextResponse.json({ ok: true, user: updated });
}
