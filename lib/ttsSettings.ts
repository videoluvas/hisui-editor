// ─── TTS プロバイダー・モデル・音声の定義と設定管理 ──────────────────────────

export type TtsProvider = "google-gemini" | "elevenlabs";

export type GeminiTtsModelKey = "gemini-tts-high";

export type TtsModelDef = {
  key: GeminiTtsModelKey;
  provider: TtsProvider;
  label: string;
  providerModelId: string;
  quality: "light" | "high";
  supportsStreaming: boolean;
  supportsMultiSpeaker: boolean;
  maxSpeakers: number;
  description: string;
};

export const GEMINI_TTS_MODELS: TtsModelDef[] = [
  {
    key: "gemini-tts-high",
    provider: "google-gemini",
    label: "Gemini 3.1 Flash TTS",
    providerModelId: "gemini-3.1-flash-tts-preview",
    quality: "high",
    supportsStreaming: true,
    supportsMultiSpeaker: true,
    maxSpeakers: 2,
    description: "最高品質・表現力重視",
  },
];

export const GEMINI_VOICES = [
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
  "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
] as const;

export type GeminiVoice = typeof GEMINI_VOICES[number];

export type VoiceGender = "男性" | "女性";

export type GeminiVoiceMeta = {
  no: number;
  name: GeminiVoice;
  gender: VoiceGender;
  trait: string;
  sampleUrl: string;
};

const _SAMPLE_BASE = "https://assets.hisui-ai.com/system/samples/step-04-narration/gemini-3.1-flash-tts";

export const GEMINI_VOICE_META: GeminiVoiceMeta[] = [
  { no:  1, name: "Zephyr",         gender: "女性", trait: "明るい",           sampleUrl: `${_SAMPLE_BASE}/01_Zephyr.wav` },
  { no:  2, name: "Puck",           gender: "男性", trait: "明るく快活",       sampleUrl: `${_SAMPLE_BASE}/02_Puck.wav` },
  { no:  3, name: "Charon",         gender: "男性", trait: "説明的",           sampleUrl: `${_SAMPLE_BASE}/03_Charon.wav` },
  { no:  4, name: "Kore",           gender: "女性", trait: "しっかりした",     sampleUrl: `${_SAMPLE_BASE}/04_Kore.wav` },
  { no:  5, name: "Fenrir",         gender: "男性", trait: "感情豊かで活発",   sampleUrl: `${_SAMPLE_BASE}/05_Fenrir.wav` },
  { no:  6, name: "Leda",           gender: "女性", trait: "若々しい",         sampleUrl: `${_SAMPLE_BASE}/06_Leda.wav` },
  { no:  7, name: "Orus",           gender: "男性", trait: "しっかりした",     sampleUrl: `${_SAMPLE_BASE}/07_Orus.wav` },
  { no:  8, name: "Aoede",          gender: "女性", trait: "軽やかで爽やか",   sampleUrl: `${_SAMPLE_BASE}/08_Aoede.wav` },
  { no:  9, name: "Callirrhoe",     gender: "女性", trait: "おおらかで自然体", sampleUrl: `${_SAMPLE_BASE}/09_Callirrhoe.wav` },
  { no: 10, name: "Autonoe",        gender: "女性", trait: "明るい",           sampleUrl: `${_SAMPLE_BASE}/10_Autonoe.wav` },
  { no: 11, name: "Enceladus",      gender: "男性", trait: "息遣いを含んだ",   sampleUrl: `${_SAMPLE_BASE}/11_Enceladus.wav` },
  { no: 12, name: "Iapetus",        gender: "男性", trait: "明瞭",             sampleUrl: `${_SAMPLE_BASE}/12_Iapetus.wav` },
  { no: 13, name: "Umbriel",        gender: "男性", trait: "おおらかで自然体", sampleUrl: `${_SAMPLE_BASE}/13_Umbriel.wav` },
  { no: 14, name: "Algieba",        gender: "男性", trait: "なめらか",         sampleUrl: `${_SAMPLE_BASE}/14_Algieba.wav` },
  { no: 15, name: "Despina",        gender: "女性", trait: "なめらか",         sampleUrl: `${_SAMPLE_BASE}/15_Despina.wav` },
  { no: 16, name: "Erinome",        gender: "女性", trait: "明瞭",             sampleUrl: `${_SAMPLE_BASE}/16_Erinome.wav` },
  { no: 17, name: "Algenib",        gender: "男性", trait: "しゃがれた",       sampleUrl: `${_SAMPLE_BASE}/17_Algenib.wav` },
  { no: 18, name: "Rasalgethi",     gender: "男性", trait: "説明的",           sampleUrl: `${_SAMPLE_BASE}/18_Rasalgethi.wav` },
  { no: 19, name: "Laomedeia",      gender: "女性", trait: "明るく快活",       sampleUrl: `${_SAMPLE_BASE}/19_Laomedeia.wav` },
  { no: 20, name: "Achernar",       gender: "女性", trait: "柔らかい",         sampleUrl: `${_SAMPLE_BASE}/20_Achernar.wav` },
  { no: 21, name: "Alnilam",        gender: "男性", trait: "しっかりした",     sampleUrl: `${_SAMPLE_BASE}/21_Alnilam.wav` },
  { no: 22, name: "Schedar",        gender: "男性", trait: "均一で安定した",   sampleUrl: `${_SAMPLE_BASE}/22_Schedar.wav` },
  { no: 23, name: "Gacrux",         gender: "女性", trait: "成熟した",         sampleUrl: `${_SAMPLE_BASE}/23_Gacrux.wav` },
  { no: 24, name: "Pulcherrima",    gender: "女性", trait: "前に出る積極的な", sampleUrl: `${_SAMPLE_BASE}/24_Pulcherrima.wav` },
  { no: 25, name: "Achird",         gender: "男性", trait: "親しみやすい",     sampleUrl: `${_SAMPLE_BASE}/25_Achird.wav` },
  { no: 26, name: "Zubenelgenubi",  gender: "男性", trait: "カジュアル",       sampleUrl: `${_SAMPLE_BASE}/26_Zubenelgenubi.wav` },
  { no: 27, name: "Vindemiatrix",   gender: "女性", trait: "優しい",           sampleUrl: `${_SAMPLE_BASE}/27_Vindemiatrix.wav` },
  { no: 28, name: "Sadachbia",      gender: "男性", trait: "活気のある",       sampleUrl: `${_SAMPLE_BASE}/28_Sadachbia.wav` },
  { no: 29, name: "Sadaltager",     gender: "男性", trait: "知的で博識な",     sampleUrl: `${_SAMPLE_BASE}/29_Sadaltager.wav` },
  { no: 30, name: "Sulafat",        gender: "女性", trait: "温かみのある",     sampleUrl: `${_SAMPLE_BASE}/30_Sulafat.wav` },
];

export const TTS_PACING_OPTIONS = [
  { value: "very_slow", label: "とてもゆっくり" },
  { value: "slow",      label: "ゆっくり" },
  { value: "normal",    label: "標準" },
  { value: "fast",      label: "やや速い" },
  { value: "very_fast", label: "速い" },
] as const;

export const TTS_TONE_OPTIONS = [
  { value: "neutral",  label: "標準" },
  { value: "bright",   label: "明るい" },
  { value: "calm",     label: "落ち着いた" },
  { value: "serious",  label: "真面目" },
  { value: "powerful", label: "力強い" },
  { value: "gentle",   label: "優しい" },
  { value: "cheerful", label: "元気" },
  { value: "sad",      label: "悲しい" },
  { value: "tense",    label: "緊張感" },
] as const;

export const PACING_TO_INSTRUCTION: Record<string, string> = {
  very_slow: "Very slowly and deliberately, with long pauses between phrases.",
  slow:      "Slowly, with deliberate pacing and natural pauses.",
  normal:    "At a natural, comfortable pace.",
  fast:      "Slightly faster than normal, with good clarity.",
  very_fast: "Quickly and efficiently, maintaining clear diction.",
};

export const TONE_TO_INSTRUCTION: Record<string, string> = {
  neutral:  "Neutral and professional.",
  bright:   "Bright, positive, and upbeat.",
  calm:     "Calm, composed, and reassuring.",
  serious:  "Serious and authoritative.",
  powerful: "Powerful, confident, and impactful.",
  gentle:   "Gentle, warm, and approachable.",
  cheerful: "Cheerful, energetic, and enthusiastic.",
  sad:      "Somber and empathetic.",
  tense:    "Tense and urgent.",
};

export type TtsSettings = {
  provider: TtsProvider;
  model: GeminiTtsModelKey;
  voice: string;
  style: string;
  pacing: string;
  tone: string;
  accent: string;
  autoChunk: boolean;
  maxChunkLength: number;
  retryCount: number;
  ttsCommonRules: string;
  ttsNegativePrompt: string;
};

export const DEFAULT_TTS_SETTINGS: TtsSettings = {
  provider: "google-gemini",
  model: "gemini-tts-high",
  voice: "Kore",
  style: "",
  pacing: "normal",
  tone: "neutral",
  accent: "",
  autoChunk: true,
  maxChunkLength: 500,
  retryCount: 2,
  ttsCommonRules: "",
  ttsNegativePrompt: "",
};

const LS_KEY = "hisui_tts_settings";

export function loadTtsSettings(): TtsSettings {
  if (typeof window === "undefined") return { ...DEFAULT_TTS_SETTINGS };
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return { ...DEFAULT_TTS_SETTINGS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_TTS_SETTINGS };
}

export function saveTtsSettings(s: TtsSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}
