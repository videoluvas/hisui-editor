// ─── コンテ変換設定 ───────────────────────────────────────────────────────────

// ── PDF ──
export type PdfPaperSize        = "A4" | "A3" | "letter";
export type PdfOrientation      = "landscape" | "portrait";
export type PdfScenesPerPage    = 1 | 2 | 4 | 6;

export type PdfSettings = {
  paperSize:     PdfPaperSize;
  orientation:   PdfOrientation;
  scenesPerPage: PdfScenesPerPage;
  showScript:    boolean;
  showNarration: boolean;
};

export const DEFAULT_PDF_SETTINGS: PdfSettings = {
  paperSize:     "A4",
  orientation:   "landscape",
  scenesPerPage: 4,
  showScript:    true,
  showNarration: true,
};

const PDF_LS_KEY = "hisui_pdf_settings";

export function loadPdfSettings(): PdfSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PDF_SETTINGS };
  try {
    const stored = localStorage.getItem(PDF_LS_KEY);
    if (stored) return { ...DEFAULT_PDF_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_PDF_SETTINGS };
}

export function savePdfSettings(s: PdfSettings): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(PDF_LS_KEY, JSON.stringify(s)); } catch {}
}

// ── Excel / CSV ──
export type SpreadsheetFormat   = "xlsx" | "csv";
export type CsvEncoding         = "utf-8" | "shift-jis";

export type SpreadsheetSettings = {
  format:        SpreadsheetFormat;
  csvEncoding:   CsvEncoding;
  includeScript:    boolean;
  includeNarration: boolean;
  includeImageUrl:  boolean;
  includeVideoUrl:  boolean;
};

export const DEFAULT_SPREADSHEET_SETTINGS: SpreadsheetSettings = {
  format:           "xlsx",
  csvEncoding:      "utf-8",
  includeScript:    true,
  includeNarration: true,
  includeImageUrl:  false,
  includeVideoUrl:  false,
};

const SS_LS_KEY = "hisui_spreadsheet_settings";

export function loadSpreadsheetSettings(): SpreadsheetSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SPREADSHEET_SETTINGS };
  try {
    const stored = localStorage.getItem(SS_LS_KEY);
    if (stored) return { ...DEFAULT_SPREADSHEET_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_SPREADSHEET_SETTINGS };
}

export function saveSpreadsheetSettings(s: SpreadsheetSettings): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SS_LS_KEY, JSON.stringify(s)); } catch {}
}

// ─── コンテ → 動画プロジェクト変換設定 ──────────────────────────────────────

export type ExportResolution = "720p" | "1080p";

export const RESOLUTION_MAP: Record<ExportResolution, { width: number; height: number; label: string }> = {
  "720p":  { width: 1280, height: 720,  label: "HD 720p (1280×720)" },
  "1080p": { width: 1920, height: 1080, label: "Full HD 1080p (1920×1080)" },
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
