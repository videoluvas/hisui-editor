export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

async function resolveOwnedScene(mainId: string, sceneId: string, userId: string) {
  const sb = await prisma.storyboardMain.findUnique({ where: { id: mainId } });
  if (!sb || sb.userId !== userId) return null;
  const scene = await prisma.storyboardScene.findUnique({ where: { id: sceneId } });
  if (!scene || scene.mainId !== mainId) return null;
  return scene;
}

export async function PUT(request: NextRequest, { params }: { params: { id: string; sceneId: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  if (!await resolveOwnedScene(params.id, params.sceneId, session.userId))
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const allowed = ["sceneNo", "title", "duration", "sourceTextChunk", "naText", "telopText",
    "imgError", "imgErrorYn", "imgPrompt", "imgPromptAngle", "imgPromptContent",
    "imgStatusYn", "imgStyle", "imgStyleIllust", "imgStyleUnifiedId", "imgUrl", "imgUrlDl",
    "videoError", "videoErrorYn", "videoId", "videoPrompt", "videoCameraFixed", "videoDuration",
    "videoGenerateAudio", "videoStatus", "videoStatusYn", "videoText", "videoUrl",
    "audioText", "audioUrl", "audioSettings"];
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];

  await prisma.storyboardScene.update({ where: { id: params.sceneId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string; sceneId: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  if (!await resolveOwnedScene(params.id, params.sceneId, session.userId))
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  await prisma.storyboardScene.delete({ where: { id: params.sceneId } });
  return NextResponse.json({ ok: true });
}
