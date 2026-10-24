export type ImageModel = "reve-1" | "seedream-5-0-pro" | "google-image-lite" | "google-image-pro" | "gpt-image-2-high" | "gpt-image-1-5" | "gpt-image-2-5-sunburst" | "gpt-image-2-5-flare";

// GPT Image 以外は使用停止中
export const GPT_IMAGE_API_MODEL: Record<string, string> = {
  "gpt-image-2-5-sunburst": "gpt-image-2.5-sunburst",
  "gpt-image-2-5-flare":    "gpt-image-2.5-flare",
  "gpt-image-2-high":       "gpt-image-2",
  "gpt-image-1-5":          "gpt-image-1.5",
};

export function isImageModelEnabled(model: string): boolean {
  return model in GPT_IMAGE_API_MODEL;
}

// 透過画像を参照した生成はこのモデル・設定に固定する
export const TRANSPARENT_IMAGE_MODEL: ImageModel = "gpt-image-2-5-sunburst";
export const TRANSPARENT_PROMPT = "背景の透明を維持してください。白背景や市松模様は描かないでください。";

export function gptSizeForRatio(aspectRatio: string): string {
  const [w, h] = aspectRatio.split(":").map(Number);
  if (!(w > 0 && h > 0) || Math.abs(Math.log(w / h)) < 0.18) return "1024x1024";
  return w > h ? "1536x1024" : "1024x1536";
}

export type RefStyle = "none" | "template" | "upload";

export type ImageSettings = {
  imageModel: ImageModel;
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
  imageModel: "gpt-image-2-5-sunburst",
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
    if (stored) {
      const s: ImageSettings = { ...DEFAULT_IMAGE_SETTINGS, ...JSON.parse(stored) };
      if (!isImageModelEnabled(s.imageModel)) s.imageModel = DEFAULT_IMAGE_SETTINGS.imageModel;
      return s;
    }
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
