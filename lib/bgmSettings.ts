export type BgmVocal = "yes" | "no" | "";

export type BgmModel = "lyria-3-pro-preview" | "lyria-2";

export type BgmSettings = {
  model:         BgmModel;
  defaultVocal:  BgmVocal;
  defaultGenre:  string;
  defaultMood:   string;
  commonPrompt:  string;
  defaultVolume: number;
};

export const DEFAULT_BGM_SETTINGS: BgmSettings = {
  model:         "lyria-3-pro-preview",
  defaultVocal:  "no",
  defaultGenre:  "",
  defaultMood:   "",
  commonPrompt:  "",
  defaultVolume: 0.7,
};

export const BGM_MODELS: {
  id: BgmModel;
  label: string;
  sub: string;
  note: string;
  lockedFree: boolean;
}[] = [
  { id: "lyria-3-pro-preview", label: "Google AI",  sub: "Lyria 3 Pro",  note: "最高品質・最新モデル", lockedFree: true  },
  { id: "lyria-2",             label: "Google AI",  sub: "Lyria 2",      note: "標準品質",             lockedFree: false },
];

const LS_KEY = "hisui_bgm_settings";

export function loadBgmSettings(): BgmSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_BGM_SETTINGS };
    return { ...DEFAULT_BGM_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BGM_SETTINGS };
  }
}

export function saveBgmSettings(s: BgmSettings): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}
