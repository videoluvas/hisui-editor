export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { hashPassword } from "@/lib/auth.password";
import { sendInviteEmail } from "@/lib/email";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (adminEmails.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

function generatePassword(len = 12): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$";
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function POST(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false, message: "権限がありません" }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    email?: string;
    name?: string;
    companyName?: string;
    customPassword?: string;
  };

  const email       = body.email?.trim().toLowerCase() ?? "";
  const name        = body.name?.trim()        ?? "";
  const companyName = body.companyName?.trim() ?? "";

  if (!email) return NextResponse.json({ ok: false, message: "メールアドレスは必須です" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ ok: false, message: "メールアドレスの形式が正しくありません" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ ok: false, message: "このメールアドレスはすでに登録されています" }, { status: 409 });

  const password     = body.customPassword?.trim() || generatePassword();
  const passwordHash = await hashPassword(password);

  const newUser = await prisma.$queryRaw<[{ id: string }]>`
    INSERT INTO users (id, email, name, company_name, password_hash, plan,
      credit_img, credit_img_max, credit_script, credit_script_max,
      credit_video, credit_video_max, credit_audio, credit_audio_max,
      credit_bgm, credit_bgm_max, created_at, updated_at)
    VALUES (
      gen_random_uuid(), ${email}, ${name || null}, ${companyName || null}, ${passwordHash}, 'Free',
      20, 20, 5, 5, 10, 10, 20, 20, 5, 5, NOW(), NOW()
    )
    RETURNING id
  `;

  const loginUrl = `${process.env.APP_URL ?? "https://hisui-ai.com"}/auth`;

  await sendInviteEmail(email, { name: name || email, password, loginUrl });

  return NextResponse.json({ ok: true, userId: newUser[0]?.id, email, password });
}
