export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

async function resolveOwned(mainId: string, userId: string) {
  const sb = await prisma.storyboardMain.findUnique({ where: { id: mainId } });
  if (!sb || sb.userId !== userId) return null;
  return sb;
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  if (!await resolveOwned(params.id, session.userId))
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const allowed = ["sceneNo", "title", "duration", "sourceTextChunk", "naText",
    "imgPrompt", "imgPromptAngle", "imgPromptContent", "imgStyle", "imgStyleIllust",
    "imgUrl", "imgUrlDl", "videoPrompt", "videoDuration", "videoStatus", "videoText", "videoUrl",
    "audioText", "audioUrl", "audioSettings"];
  const data: Record<string, unknown> = { mainId: params.id };
  for (const k of allowed) if (k in body) data[k] = body[k];

  const scene = await prisma.storyboardScene.create({ data: data as any });
  return NextResponse.json({ ok: true, scene: serializeScene(scene) });
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
