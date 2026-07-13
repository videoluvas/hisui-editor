export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { getEditJsonFromR2 } from "@/lib/project.r2";

type ProjectWithKey = { id: string; userId: string; editJsonKey: string | null };

export async function POST(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const { projectId } = await req.json();
    if (!projectId) return NextResponse.json({ ok: false, message: "projectIdが必要です" }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId } }) as ProjectWithKey | null;
    if (!project || project.userId !== session.user.id)
      return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });

    if (!project.editJsonKey)
      return NextResponse.json({ ok: false, message: "editJsonKeyがありません" }, { status: 400 });

    const editJson = await getEditJsonFromR2(project.editJsonKey);
    if (!editJson) return NextResponse.json({ ok: false, message: "editJsonの取得に失敗しました" }, { status: 500 });

    const res = await fetch(`${process.env.SHOTSTACK_API_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.SHOTSTACK_API_KEY!,
      },
      body: JSON.stringify(editJson),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ ok: false, message: data?.response?.message ?? "書き出しAPIエラー" }, { status: 500 });

    return NextResponse.json({ ok: true, renderId: data.response.id });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}