export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sendContactInquiryEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    companyName?: string;
    name?: string;
    email?: string;
    message?: string;
  };

  const companyName = body.companyName?.trim() ?? "";
  const name        = body.name?.trim()        ?? "";
  const email       = body.email?.trim()       ?? "";
  const message     = body.message?.trim()     ?? "";

  if (!companyName || !name || !email)
    return NextResponse.json({ ok: false, message: "会社名・担当者名・メールアドレスは必須です" }, { status: 400 });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ ok: false, message: "メールアドレスの形式が正しくありません" }, { status: 400 });

  try {
    await sendContactInquiryEmail({ companyName, name, email, message });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, message: `送信に失敗しました: ${msg}` }, { status: 500 });
  }
}
