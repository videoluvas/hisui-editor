import { loadExportSettings } from "@/lib/exportSettings";
import { RESOLUTION_MAP } from "@/lib/exportSettings";
import type { ExportResolution } from "@/lib/exportSettings";

export type VideoFormat  = "mp4" | "gif";
export type VideoQuality = "verylow" | "low" | "medium" | "high" | "veryhigh";

export type VideoExportSettings = {
  // ── ShotStack 出力設定 ──────────────────────────────────────────────────────
  format:           VideoFormat;
  quality:          VideoQuality;
  mute:             boolean;
  posterEnabled:    boolean;
  posterCapture:    number;
  thumbnailEnabled: boolean;
  thumbnailCapture: number;
  thumbnailScale:   number;
  callbackUrl:      string;
  // ── シーケンス設定連動（デフォルトは ExportSettings から取得） ───────────────
  resolution:       ExportResolution;        // "720p" | "1080p"
  fps:              24 | 25 | 30 | 60;
  backgroundColor:  string;
  // ── 透かし / サンドボックス ──────────────────────────────────────────────────
  sandboxMode:      boolean;  // true = 透かしあり（無料）, false = 透かしなし（本番・有料）
};

const STATIC_DEFAULTS: VideoExportSettings = {
  format:           "mp4",
  quality:          "medium",
  mute:             false,
  posterEnabled:    false,
  posterCapture:    1,
  thumbnailEnabled: false,
  thumbnailCapture: 1,
  thumbnailScale:   0.3,
  callbackUrl:      "",
  resolution:       "1080p",
  fps:              30,
  backgroundColor:  "#000000",
  sandboxMode:      false,  // 有料ユーザーデフォルトは本番（無料ユーザーはサーバー側で強制）
};

export { RESOLUTION_MAP };
export type { ExportResolution };

const LS_KEY = "hisui_video_export_settings";

export function loadVideoExportSettings(): VideoExportSettings {
  if (typeof window === "undefined") return { ...STATIC_DEFAULTS };
  try {
    // シーケンス設定（ExportSettings）からデフォルト値を取得
    const seq = loadExportSettings();
    const seqDefaults: Partial<VideoExportSettings> = {
      resolution:      seq.resolution,
      fps:             seq.fps === 24 ? 24 : seq.fps === 60 ? 60 : 30,
      backgroundColor: seq.backgroundColor,
    };

    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      return { ...STATIC_DEFAULTS, ...seqDefaults, ...JSON.parse(stored) };
    }
    return { ...STATIC_DEFAULTS, ...seqDefaults };
  } catch {}
  return { ...STATIC_DEFAULTS };
}

export function saveVideoExportSettings(s: VideoExportSettings): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

export function resetVideoExportToSequence(): VideoExportSettings {
  if (typeof window === "undefined") return { ...STATIC_DEFAULTS };
  try {
    const seq = loadExportSettings();
    return {
      ...STATIC_DEFAULTS,
      resolution:      seq.resolution,
      fps:             seq.fps === 24 ? 24 : seq.fps === 60 ? 60 : 30,
      backgroundColor: seq.backgroundColor,
    };
  } catch {
    return { ...STATIC_DEFAULTS };
  }
}
