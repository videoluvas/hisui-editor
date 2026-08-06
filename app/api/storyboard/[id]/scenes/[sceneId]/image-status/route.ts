export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; sceneId: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ generating: false, imgUrl: null, error: null }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({ where: { id: params.id } });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ generating: false, imgUrl: null, error: null }, { status: 404 });

  const scene = await prisma.storyboardScene.findUnique({ where: { id: params.sceneId } });
  if (!scene || scene.mainId !== params.id)
    return NextResponse.json({ generating: false, imgUrl: null, error: null }, { status: 404 });

  const TIMEOUT_MS = 15 * 60 * 1000; // 15分超過は生成失敗とみなす
  const tooOld = scene.imgGeneratingAt
    ? Date.now() - new Date(scene.imgGeneratingAt).getTime() > TIMEOUT_MS
    : false;

  const generating = !!scene.imgGeneratingAt && !scene.imgUrl && !scene.imgErrorYn && !tooOld;

  return NextResponse.json({
    generating,
    imgUrl: scene.imgUrl ?? null,
    error: scene.imgErrorYn ? (scene.imgError ?? "画像生成に失敗しました") : null,
  });
}
