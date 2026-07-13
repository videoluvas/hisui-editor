export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { createPresignedUploadUrl } from "@/lib/fileupload.api";

export async function POST(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();

    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { fileName, mimeType, sizeBytes, projectId, workspaceId } = await req.json();

    if (!fileName || !mimeType || !sizeBytes) {
      return NextResponse.json({ ok: false, message: "必須パラメータが不足しています" }, { status: 400 });
    }

    // ── ファイルサイズ制限 ──────────────────────────────────────────────────────
    const MAX_IMAGE_BYTES = 30  * 1024 * 1024; // 30 MB（4K 相当）
    const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB（フルHD・約20秒相当）
    const fileCategory = (mimeType as string).split("/")[0];
    if (fileCategory === "image" && sizeBytes > MAX_IMAGE_BYTES) {
      return NextResponse.json({
        ok: false,
        message: `画像は最大 30MB まで対応しています（4K 相当）。このファイル: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB`,
      }, { status: 400 });
    }
    if (fileCategory === "video" && sizeBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json({
        ok: false,
        message: `動画は最大 200MB まで対応しています（フルHD・約20秒相当）。このファイル: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB`,
      }, { status: 400 });
    }

    const result = await createPresignedUploadUrl({
      userId: session.user.id,
      fileName,
      mimeType,
      sizeBytes,
      projectId,
      workspaceId,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/fileupload/presign error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}