export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { buildEditJsonKey, putEditJsonToR2 } from "@/lib/project.r2";
import { getTimelineFonts, getShotstackFontId } from "@/lib/fonts";
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
  const fps             = settings.fps;
  const backgroundColor = settings.backgroundColor;
  const aspectRatio     = "16:9";

  // ── タイムライン構築 ──────────────────────────────────────────────────────────
  const visualClips: Record<string, unknown>[] = [];
  const audioClips:  Record<string, unknown>[] = [];
  const telopClips:  Record<string, unknown>[] = [];
  let cursor = 0;

  const fontFamily    = settings.telopFontFamily ?? "Noto Sans JP";
  const fontWeight    = settings.telopFontWeight ?? 700;
  const fontId        = getShotstackFontId(fontFamily);
  // rich-text クリップ高さ = フォントサイズ + 少し余白（仕様の 48→50 に準拠）
  const telopH        = settings.telopFontSize + 4;
  // offset.y は正値 = 上方向。クリップ中心がキャンバス端に来るため、半高さ＋42px 分だけ内側にオフセット
  const telopYAbs     = Math.round(((telopH / 2 + 42) / height) * 1000) / 1000;
  const telopYOffset  = settings.telopPosition === "bottom" ? telopYAbs : -telopYAbs;

  const useNarrationMode = settings.durationMode === "narration";
  const narPadding = Math.max(0, settings.narrationPadding ?? 0.5);

  for (const scene of sb.scenes) {
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

    if (scene.videoUrl) {
      visualClips.push({
        asset: { type: "video", src: scene.videoUrl, volume: 0 },
        start: cursor, length: videoFileLen ?? len,
        position: "center", fit: "cover",
      });
    } else if (scene.imgUrl) {
      visualClips.push({
        asset: { type: "image", src: scene.imgUrl },
        start: cursor, length: len,
        position: "center", fit: "cover",
      });
    }

    if (scene.audioUrl) {
      audioClips.push({
        asset: { type: "audio", src: scene.audioUrl, volume: settings.narrationVolume },
        start: cursor, length: audioFileLen ?? len,
      });
    }

    if (scene.telopText?.trim()) {
      telopClips.push({
        asset: {
          type: "rich-text",
          text: scene.telopText.trim(),
          font: {
            family: fontId,
            size: settings.telopFontSize,
            weight: fontWeight,
            color: settings.telopColor,
            opacity: 1,
          },
          align: { horizontal: "center", vertical: "middle" },
          ...(settings.telopShadow ? {
            shadow: { offsetX: 2, offsetY: 2, blur: 4, color: "#000000", opacity: 0.5 },
          } : {}),
        },
        start: cursor,
        length: len,
        position: settings.telopPosition,
        offset: { x: 0, y: telopYOffset },
        width,
        height: telopH,
        transform: { rotate: { angle: 0 } },
      });
    }

    cursor += len;
  }

  // ビジュアルが 1 つもない場合は透明プレースホルダを挿入
  if (visualClips.length === 0) {
    visualClips.push({
      asset: { type: "svg", src: '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"/>' },
      start: 0, length: Math.max(cursor, settings.defaultDuration),
    });
  }

  // テロップを最上位レイヤーに、ビジュアル・音声をその下に配置
  const tracks: { clips: Record<string, unknown>[] }[] = [];
  if (telopClips.length > 0) tracks.push({ clips: telopClips });
  tracks.push({ clips: visualClips });
  if (audioClips.length > 0) tracks.push({ clips: audioClips });

  const editJson = {
    timeline: {
      tracks,
      fonts: getTimelineFonts(),
      background: backgroundColor,
    },
    output: {
      format: "mp4",
      resolution: "hd",
      size: { width, height },
      fps,
    },
  };

  // ── プロジェクト作成 ──────────────────────────────────────────────────────────
  try {
    const projectId  = crypto.randomUUID();
    const editJsonKey = buildEditJsonKey(session.userId, workspaceId, projectId);
    await putEditJsonToR2(editJsonKey, editJson);

    const project = await prisma.project.create({
      data: {
        id: projectId,
        userId: session.userId,
        workspaceId,
        title: sb.title ?? "動画プロジェクト",
        aspectRatio,
        width,
        height,
        fps,
        backgroundColor,
        editJsonKey,
        durationSec: cursor > 0 ? Math.ceil(cursor) : null,
      } as any,
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
