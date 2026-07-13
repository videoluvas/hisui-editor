export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { getEditJsonFromR2 } from "@/lib/project.r2";

type ProjectWithEditJsonKey = {
  id: string;
  userId: string;
  editJsonKey: string | null;
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) {
      return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
    }) as ProjectWithEditJsonKey | null;

    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });
    }

    if (!project.editJsonKey) {
      return NextResponse.json({ ok: false, message: "editJsonKeyが存在しません" }, { status: 400 });
    }

    const editJson = await getEditJsonFromR2(project.editJsonKey);

    return NextResponse.json({ ok: true, editJson });
  } catch (error) {
    console.error("GET /api/projects/[id]/edit error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}