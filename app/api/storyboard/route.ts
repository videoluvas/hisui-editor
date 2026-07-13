export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function GET(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");

  const where: Record<string, unknown> = { userId: session.userId };
  if (workspaceId) where.workspaceId = workspaceId;

  const items = await prisma.storyboardMain.findMany({
    where: where as any,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, title: true, status: true, updatedAt: true,
      _count: { select: { scenes: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    items: items.map((s) => ({
      id: s.id,
      title: s.title,
      status: s.status,
      updatedAt: s.updatedAt.toISOString(),
      sceneCount: s._count.scenes,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "新しいコンテ").trim() || "新しいコンテ";
  const workspaceId = body.workspaceId as string | undefined;

  const storyboard = await prisma.storyboardMain.create({
    data: { userId: session.userId, title, ...(workspaceId ? { workspaceId } : {}) } as any,
    include: { scenes: { orderBy: { sceneNo: "asc" } } },
  });

  return NextResponse.json({ ok: true, storyboard: serializeMain(storyboard) });
}

function serializeMain(s: any) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    scenes: (s.scenes ?? []).map(serializeScene),
  };
}

function serializeScene(s: any) {
  return {
    ...s,
    videoDuration: s.videoDuration ? Number(s.videoDuration) : null,
    videoStartTime: s.videoStartTime ? s.videoStartTime.toISOString() : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}
