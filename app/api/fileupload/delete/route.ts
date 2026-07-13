export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME } from "@/lib/fileupload.r2";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const { fileId } = await req.json();
    if (!fileId) {
      return NextResponse.json({ ok: false, message: "fileIdが必要です" }, { status: 400 });
    }

    const file = await prisma.file.findUnique({ where: { id: fileId } });

    if (!file || file.userId !== session.user.id) {
      return NextResponse.json({ ok: false, message: "ファイルが見つかりません" }, { status: 404 });
    }

    await r2Client.send(new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: file.storageKey,
    }));

    await prisma.file.delete({ where: { id: fileId } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/fileupload/delete error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}