export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const baseUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      iconUrl: true,
      creditImg: true,
      creditImgMax: true,
      creditScript: true,
      creditScriptMax: true,
    },
  });
  if (!baseUser) return NextResponse.json({ ok: false, message: "ユーザーが見つかりません" }, { status: 404 });

  // Fetch new credit fields via raw SQL (not yet in Prisma generated types)
  const [videoAudioRow] = await prisma.$queryRaw<[{
    credit_video: number; credit_video_max: number;
    credit_audio: number; credit_audio_max: number;
    credit_bgm: number;   credit_bgm_max: number;
  }]>`
    SELECT credit_video, credit_video_max, credit_audio, credit_audio_max, credit_bgm, credit_bgm_max
    FROM users WHERE id = ${session.userId}::uuid
  `;

  const user = {
    ...baseUser,
    creditVideo:    videoAudioRow?.credit_video     ?? 10,
    creditVideoMax: videoAudioRow?.credit_video_max ?? 10,
    creditAudio:    videoAudioRow?.credit_audio     ?? 20,
    creditAudioMax: videoAudioRow?.credit_audio_max ?? 20,
    creditBgm:      videoAudioRow?.credit_bgm       ?? 5,
    creditBgmMax:   videoAudioRow?.credit_bgm_max   ?? 5,
  };

  const [creditLogs, checkoutLogs, errorLogs] = await Promise.all([
    prisma.logCredit.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.logCheckout.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.logError.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return NextResponse.json({ ok: true, user, creditLogs, checkoutLogs, errorLogs });
}
