export type ScriptModel = "claude-haiku-4-5" | "claude-sonnet-4-6" | "claude-opus-4-7";

export type ScriptSettings = {
  scriptModel: ScriptModel;
  scriptCommonRules: string;
  scriptNegativePrompt: string;
};

export const DEFAULT_SCRIPT_SETTINGS: ScriptSettings = {
  scriptModel: "claude-sonnet-4-6",
  scriptCommonRules: "視聴者に自然に届くプロ品質の日本語ナレーションを生成してください。\n1シーンで読み切れる量（50文字以内）に収めてください。\n映像の流れを意識したテンポのある文章にしてください。",
  scriptNegativePrompt: "",
};

const LS_KEY = "hisui_script_settings";

export function loadScriptSettings(): ScriptSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SCRIPT_SETTINGS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_SCRIPT_SETTINGS };
    return { ...DEFAULT_SCRIPT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SCRIPT_SETTINGS };
  }
}

export function saveScriptSettings(s: ScriptSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}
