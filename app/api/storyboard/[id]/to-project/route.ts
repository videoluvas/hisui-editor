export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { buildEditJson, createProjectFromEditJson } from "@/lib/timeline.build";
import type { TimelineSegment, TimelineClip } from "@/lib/timeline.build";
import { logError } from "@/lib/log.error";

import { RESOLUTION_MAP } from "@/lib/exportSettings";
import type { ExportSettings } from "@/lib/exportSettings";

const FALLBACK_SETTINGS: ExportSettings = {
  resolution: "1080p", fps: 30, backgroundColor: "#000000",
  durationMode: "narration", defaultDuration: 5, narrationPadding: 0.5,
  telopFontSize: 52, telopFontFamily: "Noto Sans JP", telopFontWeight: 700,
  telopColor: "#ffffff", telopPosition: "bottom", telopShadow: true,
  narrationVolume: 1,
};

// videoDuration は Prisma.Decimal (Decimal.js 互換) で返るため Number() で変換する
function sceneDuration(videoDuration: unknown, duration: string | null, defaultDuration: number): number {
  if (videoDuration != null) {
    const n = Number(videoDuration);
    if (!isNaN(n) && n > 0) return n;
  }
  if (duration) {
    const n = parseFloat(duration);
    if (!isNaN(n) && n > 0) return n;
  }
  return defaultDuration;
}

// "ナレーションに合わせる" モード: audioUrl があり duration（ナレーション尺）が保存済みならそれを使用
function sceneDurationNarration(
  scene: { videoDuration: unknown; duration: string | null; audioUrl: string | null },
  defaultDuration: number,
  padding: number,
): number {
  if (scene.audioUrl && scene.duration) {
    const n = parseFloat(scene.duration);
    if (!isNaN(n) && n > 0) return Math.round((n + padding * 2) * 100) / 100;
  }
  // ナレーションがない（または尺未保存）→ 映像尺 → フォールバック（パディングなし）
  return sceneDuration(scene.videoDuration, scene.audioUrl ? null : scene.duration, defaultDuration);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({
    where: { id: params.id },
    include: { scenes: { orderBy: { sceneNo: "asc" } } },
  });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "コンテが見つかりません" }, { status: 404 });

  const workspaceId = sb.workspaceId;
  if (!workspaceId)
    return NextResponse.json({ ok: false, message: "ワークスペースが設定されていません" }, { status: 400 });

  const settings: ExportSettings = { ...FALLBACK_SETTINGS, ...(await req.json().catch(() => ({}))) };
  const { width, height } = RESOLUTION_MAP[settings.resolution] ?? RESOLUTION_MAP["1080p"];
  const size = { width, height, fps: settings.fps, backgroundColor: settings.backgroundColor };

  const useNarrationMode = settings.durationMode === "narration";
  const narPadding = Math.max(0, settings.narrationPadding ?? 0.5);

  const segments: TimelineSegment[] = sb.scenes.map((scene) => {
    const len = useNarrationMode
      ? sceneDurationNarration(scene, settings.defaultDuration, narPadding)
      : sceneDuration(scene.videoDuration, scene.duration, settings.defaultDuration);

    // ファイル実尺（保存済みの場合はそれを使用し、短くてもクリップしない）
    const videoFileLen = scene.videoDuration != null
      ? (() => { const n = Number(scene.videoDuration); return !isNaN(n) && n > 0 ? n : null; })()
      : null;
    const audioFileLen = scene.audioUrl && scene.duration
      ? (() => { const n = parseFloat(scene.duration); return !isNaN(n) && n > 0 ? n : null; })()
      : null;

    const layers: TimelineClip[] = [];
    if (scene.videoUrl) {
      layers.push({ asset: { type: "video", src: scene.videoUrl, volume: 0 }, length: videoFileLen ?? len, position: "center", fit: "cover" });
    } else if (scene.imgUrl) {
      layers.push({ asset: { type: "image", src: scene.imgUrl }, position: "center", fit: "cover" });
    }

    return {
      length: len,
      layers,
      audio: scene.audioUrl ? { src: scene.audioUrl, volume: settings.narrationVolume, length: audioFileLen ?? len } : undefined,
      telop: scene.telopText ?? undefined,
    };
  });

  const { editJson, duration } = buildEditJson(segments, size, {
    fontFamily: settings.telopFontFamily ?? "Noto Sans JP",
    fontWeight: settings.telopFontWeight ?? 700,
    fontSize:   settings.telopFontSize,
    color:      settings.telopColor,
    position:   settings.telopPosition,
    shadow:     settings.telopShadow,
  }, settings.defaultDuration);

  // ── プロジェクト作成 ──────────────────────────────────────────────────────────
  try {
    const project = await createProjectFromEditJson({
      userId: session.userId,
      workspaceId,
      title: sb.title ?? "動画プロジェクト",
      size,
      editJson,
      duration,
    });

    // コンテとプロジェクトを紐付け
    await prisma.storyboardMain.update({
      where: { id: params.id },
      data: { projectId: project.id } as any,
    });

    return NextResponse.json({ ok: true, project });
  } catch (e) {
    await logError("to-project", `${e}`, {
      userId: session.userId,
      detail: { storyboardId: params.id },
    });
    return NextResponse.json({ ok: false, message: `変換に失敗しました: ${e}` }, { status: 500 });
  }
}
