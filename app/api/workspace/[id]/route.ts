export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const ws = await (prisma as any).workspace.findUnique({ where: { id: params.id } });
    if (!ws || ws.userId !== session.userId)
      return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "").trim() || ws.name;

    await (prisma as any).workspace.update({ where: { id: params.id }, data: { name } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[workspace PUT]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const ws = await (prisma as any).workspace.findUnique({ where: { id: params.id } });
    if (!ws || ws.userId !== session.userId)
      return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

    // コンテ（シーンはカスケード）→ ファイル → プロジェクト → ワークスペースの順で削除
    await prisma.storyboardMain.deleteMany({ where: { workspaceId: params.id } });
    await prisma.file.deleteMany({ where: { workspaceId: params.id } });
    await prisma.project.deleteMany({ where: { workspaceId: params.id } });
    await (prisma as any).workspace.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[workspace DELETE]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}
