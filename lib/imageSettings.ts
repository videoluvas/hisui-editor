export type ImageModel = "reve-1" | "seedream-5-0-pro" | "google-image-lite" | "google-image-pro" | "gpt-image-2-high" | "gpt-image-1-5";

export type RefStyle = "none" | "template" | "upload";

export type ImageSettings = {
  imageModel: ImageModel;
  // 全モデル共通
  imgCommonRules: string;
  imgNegativePrompt: string;
  // Reve AI (reve-1) 専用
  aspectRatio: string;
  version: string;
  testTimeScaling: number;
  upscaleFactor: number;
  removeBg: boolean;
  fitImageMaxDim: number;
  // Seedream 5.0 Pro 専用
  sdAspectRatio: string;
  sdResolution: "1K" | "2K";
  sdOutputFormat: "jpeg" | "png";
  sdWatermark: boolean;
  sdOptimizePrompt: boolean;
  // Google AI (Nano Banana) 専用
  googleAspectRatio: string;
  googleOutputFormat: "jpeg" | "png";
  googleQualityHint: "" | "detail" | "cinematic" | "commercial";
  googleImageSize: "0.5K" | "1K" | "2K" | "4K";
  googleThinkingLevel: "minimal" | "high";
  // GPT Image 2 (high) 専用
  gptSize: string;
  gptQuality: "auto" | "low" | "medium" | "high";
  gptBackground: "auto" | "opaque" | "transparent";
  gptCompression: number;
  gptModeration: "auto" | "low";
  gptOutputFormat: "png" | "jpeg" | "webp";
  // ワークスペース参照スタイル（「参照して生成」のデフォルト）
  refStyle: RefStyle;
  refTemplateId: string;
  refImageUrl: string;
};

export const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  imageModel: "google-image-lite",
  imgCommonRules: "プロンプト内に文字を表示する明確な指示がない限り、画像内に文字、字幕、テロップなどのテキスト要素を一切含めないでください。\n人物を描写する場合は、プロンプト内に国籍・人種・地域などの指定がない限り、日本人として描写してください。",
  imgNegativePrompt: "",
  aspectRatio: "16:9",
  version: "latest",
  testTimeScaling: 1,
  upscaleFactor: 0,
  removeBg: false,
  fitImageMaxDim: 0,
  sdAspectRatio: "16:9",
  sdResolution: "1K",
  sdOutputFormat: "jpeg",
  sdWatermark: false,
  sdOptimizePrompt: false,
  googleAspectRatio: "16:9",
  googleOutputFormat: "jpeg",
  googleQualityHint: "",
  googleImageSize: "1K",
  googleThinkingLevel: "minimal",
  gptSize: "1536x1024",
  gptQuality: "high",
  gptBackground: "auto",
  gptCompression: 100,
  gptModeration: "auto",
  gptOutputFormat: "png",
  refStyle: "none",
  refTemplateId: "",
  refImageUrl: "",
};

const LS_KEY = "hisui_img_settings";

export function loadImageSettings(): ImageSettings {
  if (typeof window === "undefined") return { ...DEFAULT_IMAGE_SETTINGS };
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return { ...DEFAULT_IMAGE_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_IMAGE_SETTINGS };
}

export function saveImageSettings(s: ImageSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

export const SEEDREAM_SIZE_MAP: Record<string, Record<string, string>> = {
  "1K": {
    "1:1":  "1024x1024",
    "4:3":  "1152x864",
    "3:4":  "864x1152",
    "16:9": "1424x800",
    "9:16": "800x1424",
    "3:2":  "1248x832",
    "2:3":  "832x1248",
    "21:9": "1568x672",
  },
  "2K": {
    "1:1":  "2048x2048",
    "4:3":  "2368x1776",
    "3:4":  "1776x2368",
    "16:9": "2816x1584",
    "9:16": "1584x2816",
    "3:2":  "2496x1664",
    "2:3":  "1664x2496",
    "21:9": "3136x1344",
  },
};

export function resolveSeedreamSize(resolution: "1K" | "2K", aspectRatio: string): string {
  return SEEDREAM_SIZE_MAP[resolution]?.[aspectRatio] ?? resolution;
}
