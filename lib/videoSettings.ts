export type VideoSettings = {
  videoModel: string;
  resolution: "720p" | "1080p" | "4k";
  ratio: "16:9" | "4:3" | "1:1" | "3:4" | "9:16" | "21:9" | "adaptive";
  duration: number;       // 4–15 の整数（Kling v3 は 3–15）、または -1（AI自動）
  generateAudio: boolean;
  klingMultiShot: boolean; // Kling v3/turbo/omni: マルチショット（自動カット割り）
  klingElements: string[]; // Kling 3.0/omni: 参照Elementの画像URL（最大3件/7件）
  // Kling camera_control（3.0 / Omni のみ）各軸 -10 〜 +10、0 = 指定なし
  klingCamHorizontal: number;
  klingCamVertical: number;
  klingCamPan: number;
  klingCamTilt: number;
  klingCamRoll: number;
  klingCamZoom: number;
  cameraFixed: boolean;
  watermark: boolean;
  // Veo 専用
  seed: number;           // 0 = 未設定
  personGeneration: "allow_adult" | "allow_all" | "dont_allow";
  compressionQuality: "optimized" | "lossless";
  vidCommonRules: string;
  vidNegativePrompt: string;
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  videoModel: "veo-3-lite",
  resolution: "720p",
  ratio: "16:9",
  duration: 8,
  generateAudio: false,
  klingMultiShot: false,
  klingElements: [],
  klingCamHorizontal: 0,
  klingCamVertical: 0,
  klingCamPan: 0,
  klingCamTilt: 0,
  klingCamRoll: 0,
  klingCamZoom: 0,
  cameraFixed: false,
  watermark: false,
  seed: 0,
  personGeneration: "allow_adult",
  compressionQuality: "optimized",
  vidCommonRules: "",
  vidNegativePrompt: "",
};

const LS_KEY = "hisui_video_settings";

export function loadVideoSettings(): VideoSettings {
  if (typeof window === "undefined") return { ...DEFAULT_VIDEO_SETTINGS };
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.resolution === "480p") parsed.resolution = "720p";
      return { ...DEFAULT_VIDEO_SETTINGS, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_VIDEO_SETTINGS };
}

export function saveVideoSettings(s: VideoSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}
