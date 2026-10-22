export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { isConfigured } from "@/lib/auth.oauth";

// 設定済みのログイン方法だけを画面に出すため
export async function GET() {
  return NextResponse.json({
    ok: true,
    google: isConfigured("google"),
    microsoft: isConfigured("microsoft"),
    emailLink: !!process.env.AUTH_LINK_SECRET && !!process.env.RESEND_API_KEY,
  });
}
