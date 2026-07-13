export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { getUserFiles } from "@/lib/fileupload.api";

export async function GET(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();

    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") ?? undefined;
    const workspaceId = searchParams.get("workspaceId") ?? undefined;

    const files = await getUserFiles(session.user.id, projectId, workspaceId);

    return NextResponse.json({ ok: true, files });
  } catch (error) {
    console.error("GET /api/fileupload/list error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}