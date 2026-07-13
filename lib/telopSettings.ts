export type TelopModel = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-7";

export type TelopSettings = {
  telopModel: TelopModel;
  telopCommonRules: string;
  telopNegativePrompt: string;
};

export const DEFAULT_TELOP_SETTINGS: TelopSettings = {
  telopModel: "claude-haiku-4-5",
  telopCommonRules: "動画に表示するテロップ（字幕・タイトル・キャッチコピー）を生成してください。\n1シーンで表示できる量（20文字以内）に収めてください。\n読みやすく、インパクトのある言葉を選んでください。",
  telopNegativePrompt: "",
};

const LS_KEY = "hisui_telop_settings";

export function loadTelopSettings(): TelopSettings {
  if (typeof window === "undefined") return { ...DEFAULT_TELOP_SETTINGS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_TELOP_SETTINGS };
    return { ...DEFAULT_TELOP_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TELOP_SETTINGS };
  }
}

export function saveTelopSettings(s: TelopSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
