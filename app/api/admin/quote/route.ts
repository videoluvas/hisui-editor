export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { sendQuoteEmail, QUOTE_PLANS } from "@/lib/email";

async function isAdmin(userId: string): Promise<boolean> {
  const adminEmails = (process.env.ADMIN_EMAIL ?? "")
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!adminEmails.length) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user?.email && adminEmails.includes(user.email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!(await isAdmin(session.userId))) return NextResponse.json({ ok: false }, { status: 403 });

  const body = await req.json().catch(() => ({})) as {
    userId?:     string;
    planId?:     string;
    validDays?:  number;
    customNote?: string;
  };

  if (!body.userId) return NextResponse.json({ ok: false, message: "userId が必要です" }, { status: 400 });

  const plan = QUOTE_PLANS[body.planId ?? "Business"];
  if (!plan) return NextResponse.json({ ok: false, message: "不明なプランです" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: body.userId },
    select: { email: true, name: true },
  });
  if (!target?.email) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  const validDays  = Math.max(1, Math.min(90, body.validDays ?? 14));
  const validUntil = new Date(Date.now() + validDays * 86_400_000)
    .toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  await sendQuoteEmail({
    toEmail:    target.email,
    toName:     target.name,
    plan,
    validUntil,
    customNote: body.customNote,
  });

  return NextResponse.json({ ok: true });
}
