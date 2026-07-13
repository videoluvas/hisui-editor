export type CustomFont = {
  family: string;
  src: string;
  weight?: number;
  label?: string;
  category?: "gothic" | "mincho" | "rounded" | "display";
};

// Shotstack timeline.fonts に渡すフォント（現在は Google Fonts のみ使用）
export const CUSTOM_FONTS: CustomFont[] = [];

// Shotstack timeline.fonts に渡す配列
export const getTimelineFonts = () =>
  CUSTOM_FONTS.map((f) => ({ src: f.src }));

// フォントファミリー名一覧（重複除去）
export const FONT_FAMILIES = [...new Set(CUSTOM_FONTS.map((f) => f.family))];

export const DEFAULT_FONT: CustomFont = CUSTOM_FONTS[0] ?? { family: "Noto Sans JP", src: "", weight: 400 };

// Shotstack に登録済みのカスタムフォント ID マッピング
// キー: ExportSettings.telopFontFamily の値、値: Shotstack font ID
// 未登録の場合はフォント名をそのまま使用する
export const SHOTSTACK_TELOP_FONT_IDS: Record<string, string> = {
  "Noto Sans JP":  "-F62fjtqLzI2JPCgQBnw7HFoxgIO2lZ9hg",
  "Noto Serif JP": "xn7mYHs72GKoTvER4Gn3b5eMXN6kYkY0T84",
};

export function getShotstackFontId(fontFamily: string): string {
  return SHOTSTACK_TELOP_FONT_IDS[fontFamily] ?? fontFamily;
}
