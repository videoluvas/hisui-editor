export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

async function resolveOwned(id: string, userId: string) {
  const sb = await prisma.storyboardMain.findUnique({ where: { id } });
  if (!sb || sb.userId !== userId) return null;
  return sb;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({
    where: { id: params.id },
    include: { scenes: { orderBy: { sceneNo: "asc" } } },
  });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  return NextResponse.json({ ok: true, storyboard: serialize(sb) });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  if (!await resolveOwned(params.id, session.userId))
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const allowed = ["title", "originalScript", "duration", "prompt", "speed", "status",
    "aiScriptLog", "aiScriptLogEx", "projectId", "log"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  await prisma.storyboardMain.update({ where: { id: params.id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  if (!await resolveOwned(params.id, session.userId))
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  await prisma.storyboardMain.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}

function serialize(s: any) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    scenes: (s.scenes ?? []).map((sc: any) => ({
      ...sc,
      videoDuration: sc.videoDuration ? Number(sc.videoDuration) : null,
      videoStartTime: sc.videoStartTime ? sc.videoStartTime.toISOString() : null,
      createdAt: sc.createdAt.toISOString(),
      updatedAt: sc.updatedAt.toISOString(),
    })),
  };
}
