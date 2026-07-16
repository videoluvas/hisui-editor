export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const base = await prisma.user.findUnique({
    where:  { id: session.userId },
    select: { plan: true, creditImg: true, creditImgMax: true, creditScript: true, creditScriptMax: true },
  });
  if (!base) return NextResponse.json({ ok: false }, { status: 404 });

  const [row] = await prisma.$queryRaw<[{
    credit_video: number; credit_video_max: number;
    credit_audio: number; credit_audio_max: number;
    credit_bgm: number;   credit_bgm_max: number;
  }]>`
    SELECT credit_video, credit_video_max, credit_audio, credit_audio_max, credit_bgm, credit_bgm_max
    FROM users WHERE id = ${session.userId}::uuid
  `;

  return NextResponse.json({
    ok: true,
    plan:            base.plan,
    creditScript:    base.creditScript,
    creditScriptMax: base.creditScriptMax,
    creditImg:       base.creditImg,
    creditImgMax:    base.creditImgMax,
    creditVideo:     row?.credit_video     ?? 10,
    creditVideoMax:  row?.credit_video_max ?? 10,
    creditAudio:     row?.credit_audio     ?? 20,
    creditAudioMax:  row?.credit_audio_max ?? 20,
    creditBgm:       row?.credit_bgm       ?? 5,
    creditBgmMax:    row?.credit_bgm_max   ?? 5,
  });
}
