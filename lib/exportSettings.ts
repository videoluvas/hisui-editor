// ─── コンテ → 動画プロジェクト変換設定 ──────────────────────────────────────

export type ExportResolution = "720p" | "1080p" | "4k";

export const RESOLUTION_MAP: Record<ExportResolution, { width: number; height: number; label: string }> = {
  "720p":  { width: 1280,  height: 720,  label: "HD 720p (1280×720)" },
  "1080p": { width: 1920,  height: 1080, label: "Full HD 1080p (1920×1080)" },
  "4k":    { width: 3840,  height: 2160, label: "4K UHD (3840×2160)" },
};

export type TelopFontFamily = "Noto Sans JP" | "Noto Serif JP";
export type TelopFontWeight = 300 | 400 | 500 | 700 | 900;

export type DurationMode = "narration" | "fixed";

export type ExportSettings = {
  resolution:        ExportResolution;
  fps:               24 | 30 | 60;
  backgroundColor:   string;
  durationMode:      DurationMode;  // "narration" = ナレーションに合わせる / "fixed" = 尺を指定する
  defaultDuration:   number;        // 秒（durationMode="fixed" 時、またはナレーションがない場合のフォールバック）
  narrationPadding:  number;        // 秒（durationMode="narration" 時、ナレーション前後に追加するパディング）
  telopFontSize:     number;
  telopFontFamily:   TelopFontFamily;
  telopFontWeight:   TelopFontWeight;
  telopColor:        string;
  telopPosition:     "top" | "bottom";
  telopShadow:       boolean;
  narrationVolume:   number;        // 0〜1
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  resolution:       "1080p",
  fps:              30,
  backgroundColor:  "#000000",
  durationMode:     "narration",
  defaultDuration:  5,
  narrationPadding: 0.5,
  telopFontSize:    52,
  telopFontFamily:  "Noto Sans JP",
  telopFontWeight:  700,
  telopColor:       "#ffffff",
  telopPosition:    "bottom",
  telopShadow:      true,
  narrationVolume:  1,
};

const LS_KEY = "hisui_export_settings";

export function loadExportSettings(): ExportSettings {
  if (typeof window === "undefined") return { ...DEFAULT_EXPORT_SETTINGS };
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return { ...DEFAULT_EXPORT_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_EXPORT_SETTINGS };
}

export function saveExportSettings(s: ExportSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}
