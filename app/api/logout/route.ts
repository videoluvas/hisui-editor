export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  getSessionTokenFromCookie,
  deleteEditorSessionByToken,
  clearEditorSessionCookie,
} from "@/lib/auth.backend";

export async function POST() {
  try {
    const sessionToken = await getSessionTokenFromCookie();

    if (sessionToken) {
      await deleteEditorSessionByToken(sessionToken);
    }

    await clearEditorSessionCookie();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/logout error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}