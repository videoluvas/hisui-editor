import { prisma } from "@/lib/prisma";
import { buildEditJsonKey, putEditJsonToR2 } from "@/lib/project.r2";
import { getTimelineFonts, getShotstackFontId } from "@/lib/fonts";

// startOffset: 区間の頭から何秒遅れて出すか（length 省略時は区間の終わりまで）
export type TimelineClip = Record<string, unknown> & { length?: number; startOffset?: number };

// 1 区間（コンテの 1 シーン / パワポの 1 スライド）。layers は下→上の順で、同じ番号の層は同じトラックに並ぶ
export type TimelineSegment = {
  length: number;
  layers: TimelineClip[];
  audio?: { src: string; volume: number; length?: number; offset?: number };
  telop?: string;
};

export type TelopStyle = {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  color: string;
  position: "top" | "bottom";
  shadow: boolean;
};

export type TimelineSize = { width: number; height: number; fps: number; backgroundColor: string };

export function buildEditJson(segments: TimelineSegment[], size: TimelineSize, telop?: TelopStyle, minLength = 5) {
  const { width, height, fps, backgroundColor } = size;
  const layerTracks: TimelineClip[][] = [];
  const audioClips:  TimelineClip[] = [];
  const telopClips:  TimelineClip[] = [];
  let cursor = 0;

  // rich-text クリップ高さ = フォントサイズ + 少し余白。offset.y は正値 = 上方向で、半高さ＋42px 分だけ内側に寄せる
  const telopH = telop ? telop.fontSize + 4 : 0;
  const telopYAbs = telop ? Math.round(((telopH / 2 + 42) / height) * 1000) / 1000 : 0;

  for (const seg of segments) {
    seg.layers.forEach(({ startOffset, ...clip }, i) => {
      const off = Math.min(Math.max(startOffset ?? 0, 0), Math.max(seg.length - 0.1, 0));
      (layerTracks[i] ??= []).push({ ...clip, start: cursor + off, length: clip.length ?? seg.length - off });
    });

    if (seg.audio) {
      audioClips.push({
        asset: { type: "audio", src: seg.audio.src, volume: seg.audio.volume },
        start: cursor + (seg.audio.offset ?? 0), length: seg.audio.length ?? seg.length - (seg.audio.offset ?? 0),
      });
    }

    if (telop && seg.telop?.trim()) {
      telopClips.push({
        asset: {
          type: "rich-text",
          text: seg.telop.trim(),
          font: { family: getShotstackFontId(telop.fontFamily), size: telop.fontSize, weight: telop.fontWeight, color: telop.color, opacity: 1 },
          align: { horizontal: "center", vertical: "middle" },
          ...(telop.shadow ? { shadow: { offsetX: 2, offsetY: 2, blur: 4, color: "#000000", opacity: 0.5 } } : {}),
        },
        start: cursor,
        length: seg.length,
        position: telop.position,
        offset: { x: 0, y: telop.position === "bottom" ? telopYAbs : -telopYAbs },
        width,
        height: telopH,
        transform: { rotate: { angle: 0 } },
      });
    }

    cursor += seg.length;
  }

  // ビジュアルが 1 つもない場合は透明プレースホルダを挿入
  if (layerTracks.length === 0) {
    layerTracks.push([{
      asset: { type: "svg", src: '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"/>' },
      start: 0, length: Math.max(cursor, minLength),
    }]);
  }

  // Shotstack は先頭のトラックが最前面。テロップ → 上の層 → 下の層 → 音声 の順
  const tracks: { clips: TimelineClip[] }[] = [];
  if (telopClips.length > 0) tracks.push({ clips: telopClips });
  for (const clips of [...layerTracks].reverse()) if (clips?.length) tracks.push({ clips });
  if (audioClips.length > 0) tracks.push({ clips: audioClips });

  const editJson = {
    timeline: { tracks, fonts: getTimelineFonts(), background: backgroundColor },
    output: { format: "mp4", resolution: "hd", size: { width, height }, fps },
  };
  return { editJson, duration: cursor };
}

export function aspectRatioLabel(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(width, height) || 1;
  return `${width / g}:${height / g}`;
}

export async function createProjectFromEditJson(p: {
  userId: string;
  workspaceId: string;
  title: string;
  size: TimelineSize;
  editJson: unknown;
  duration: number;
}) {
  const projectId   = crypto.randomUUID();
  const editJsonKey = buildEditJsonKey(p.userId, p.workspaceId, projectId);
  await putEditJsonToR2(editJsonKey, p.editJson);

  return prisma.project.create({
    data: {
      id: projectId,
      userId: p.userId,
      workspaceId: p.workspaceId,
      title: p.title,
      aspectRatio: aspectRatioLabel(p.size.width, p.size.height),
      width: p.size.width,
      height: p.size.height,
      fps: p.size.fps,
      backgroundColor: p.size.backgroundColor,
      editJsonKey,
      durationSec: p.duration > 0 ? Math.ceil(p.duration) : null,
    },
  });
}
