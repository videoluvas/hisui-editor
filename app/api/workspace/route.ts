export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const workspaces = await (prisma as any).workspace.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      workspaces: workspaces.map((w: any) => ({
        id: w.id,
        name: w.name,
        createdAt: w.createdAt.toISOString(),
        updatedAt: w.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("[workspace GET]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name ?? "新しいワークスペース").trim() || "新しいワークスペース";

    const workspace = await (prisma as any).workspace.create({
      data: { userId: session.userId, name },
    });

    return NextResponse.json({
      ok: true,
      workspace: {
        id: workspace.id,
        name: workspace.name,
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    });
  } catch (e) {
    console.error("[workspace POST]", e);
    return NextResponse.json({ ok: false, message: `サーバーエラー: ${e}` }, { status: 500 });
  }
}
