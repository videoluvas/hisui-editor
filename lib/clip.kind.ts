import { loadGenMeta } from "@/lib/gen.meta";

// ─── タイムライン上のクリップの種類 ─────────────────────────────────────────
// パワーポイント由来は取り込み時の manifest（/api/projects/[id]/clip-kinds）で、
// それ以外はアセットの type と生成メタ（gen.meta）で見分ける

export type PptxObjectKind = "pptx-text" | "pptx-shape" | "pptx-picture" | "pptx-background" | "pptx-video" | "pptx-audio";

export type ClipKind =
  | PptxObjectKind
  | "text"        // 字幕ツールの文字（rich-text / text）
  | "shape"       // 図形を追加（svg）
  | "ai-image"
  | "image"       // アップロードした画像
  | "deco-telop"
  | "ai-video"
  | "video"
  | "narration"
  | "bgm"
  | "audio";

// ①パネルに出すメニューの組
export type ClipMenu = "decorate" | "picture" | "video" | "deco-telop" | "narration" | "audio";

export const CLIP_MENU: Record<ClipKind, ClipMenu> = {
  "pptx-text":       "decorate",
  "pptx-shape":      "decorate",
  "text":            "decorate",
  "shape":           "decorate",
  "pptx-picture":    "picture",
  "pptx-background": "picture",
  "ai-image":        "picture",
  "image":           "picture",
  "deco-telop":      "deco-telop",
  "pptx-video":      "video",
  "ai-video":        "video",
  "video":           "video",
  "narration":       "narration",
  "pptx-audio":      "audio",
  "bgm":             "audio",
  "audio":           "audio",
};

export const CLIP_KIND_LABEL: Record<ClipKind, string> = {
  "pptx-text":       "文字（パワーポイント）",
  "pptx-shape":      "図形（パワーポイント）",
  "pptx-picture":    "埋め込み画像（パワーポイント）",
  "pptx-background": "スライド背景",
  "pptx-video":      "動画（パワーポイント）",
  "pptx-audio":      "音声（パワーポイント）",
  "text":            "文字",
  "shape":           "図形",
  "ai-image":        "AI 画像",
  "image":           "画像",
  "deco-telop":      "装飾テロップ",
  "ai-video":        "AI 動画",
  "video":           "動画",
  "narration":       "ナレーション",
  "bgm":             "BGM",
  "audio":           "音声",
};

// 再生成・AI で装飾のネガティブプロンプトの初期値（ユーザーが編集できる）
const TEXT_NEGATIVE  = "文字の内容・字形・行の並びの変更、文字の追加・削除・言い換え・翻訳、文字が読みにくくなる装飾、背景や新しいモチーフ";
const SHAPE_NEGATIVE = "図形の形・輪郭・向き・配置の変更、文字、新しい要素、背景";
const PHOTO_NEGATIVE = "被写体・構図・色調の大きな変更、指示のない文字・ロゴ・透かし";

export const DEFAULT_IMAGE_NEGATIVE = "指示のない文字・字幕・テロップ、ロゴ・透かし";

export const CLIP_KIND_NEGATIVE: Partial<Record<ClipKind, string>> = {
  "text":            TEXT_NEGATIVE,
  "pptx-text":       TEXT_NEGATIVE,
  "shape":           SHAPE_NEGATIVE,
  "pptx-shape":      SHAPE_NEGATIVE,
  "image":           PHOTO_NEGATIVE,
  "pptx-picture":    PHOTO_NEGATIVE,
  "pptx-background": "構図・色調の大きな変更、上に重ねる文字を読みにくくする派手な柄や強いコントラスト、文字・ロゴ・透かし",
};

// converter の kind（text / shape / picture / media / table / chart / diagram / group / connector / other）を振り分ける
export function pptxObjectKind(kind: string, media?: "video" | "audio"): PptxObjectKind {
  if (media === "video") return "pptx-video";
  if (media === "audio") return "pptx-audio";
  if (kind === "picture") return "pptx-picture";
  if (kind === "text") return "pptx-text";
  return "pptx-shape";
}

type ClipLike = { asset?: { type?: string; src?: string } };

export function classifyClip(clip: ClipLike, pptxKinds: Record<string, PptxObjectKind>): ClipKind | null {
  const type = clip.asset?.type;
  const src  = clip.asset?.src;
  if (type === "rich-text" || type === "text") return "text";
  if (type === "svg") return "shape";
  if (!src) return null;
  if (pptxKinds[src]) return pptxKinds[src];
  const meta = loadGenMeta(src);
  if (type === "image") {
    if (meta?.type === "ai-image" && meta.sourceKind && meta.sourceKind in CLIP_MENU) return meta.sourceKind as ClipKind;
    return meta?.type === "deco-telop" ? "deco-telop" : meta?.type === "ai-image" ? "ai-image" : "image";
  }
  if (type === "video") return meta?.type === "ai-video" ? "ai-video" : "video";
  if (type === "audio") return meta?.type === "ai-narration" ? "narration" : meta?.type === "bgm" ? "bgm" : "audio";
  return null;
}

export async function fetchPptxClipKinds(projectId: string): Promise<Record<string, PptxObjectKind>> {
  try {
    const res = await fetch(`/api/projects/${projectId}/clip-kinds`);
    const data = await res.json() as { ok: boolean; kinds?: Record<string, PptxObjectKind> };
    return data.ok && data.kinds ? data.kinds : {};
  } catch { return {}; }
}
