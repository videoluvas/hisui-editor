export type ImageStyleTemplate = {
  id: string;
  name: string;
  description: string;
  stylePrompt: string;
  sampleImageUrl: string;
  category: "illustration";
};

const _BASE = "https://assets.hisui-ai.com/system/samples/step-02-image-generation/style-templates";

export const IMAGE_STYLE_TEMPLATES: ImageStyleTemplate[] = [
  {
    id: "illust-line-mono",
    name: "シンプル線画",
    description: "モノクロスケッチ・クリーンな輪郭線",
    stylePrompt: "simple monochrome line art, clean sketch, black ink on white background, minimal shading, contour drawing, no color fill",
    sampleImageUrl: `${_BASE}/style%20(1).png`,
    category: "illustration",
  },
  {
    id: "illust-manga-line",
    name: "感情強調線画",
    description: "漫画寄りの表情豊かなイラスト",
    stylePrompt: "manga-style line art, expressive emotional illustration, dynamic linework, Japanese manga aesthetics, comic book style",
    sampleImageUrl: `${_BASE}/style%20(2).png`,
    category: "illustration",
  },
  {
    id: "illust-pencil",
    name: "写実鉛筆スケッチ",
    description: "リアルな鉛筆・グラファイトデッサン",
    stylePrompt: "realistic pencil sketch, detailed graphite illustration, fine crosshatching, textured paper, traditional art, hand-drawn",
    sampleImageUrl: `${_BASE}/style%20(3).png`,
    category: "illustration",
  },
  {
    id: "illust-warm-book",
    name: "暖色絵本イラスト",
    description: "温かみあるリアル系イラスト（絵本風）",
    stylePrompt: "warm-toned realistic illustration, picture book style, soft brush strokes, cozy atmosphere, storybook art, warm colors",
    sampleImageUrl: `${_BASE}/style%20(4).png`,
    category: "illustration",
  },
  {
    id: "illust-watercolor",
    name: "淡色水彩",
    description: "ふんわり優しいパステル水彩",
    stylePrompt: "soft pastel watercolor painting, light airy color washes, dreamy gentle colors, delicate brushwork, transparent layers",
    sampleImageUrl: `${_BASE}/style%20(5).png`,
    category: "illustration",
  },
  {
    id: "illust-anime-bg",
    name: "アニメ背景イラスト",
    description: "カラフルで鮮やかなアニメ風背景",
    stylePrompt: "colorful anime background art, vibrant landscape illustration, detailed scenery, anime style environment, lush environment art",
    sampleImageUrl: `${_BASE}/style%20(6).png`,
    category: "illustration",
  },
  {
    id: "illust-anime-cel",
    name: "現代アニメ（セルルック）",
    description: "クリーンなセルシェーディングの現代アニメ",
    stylePrompt: "modern anime cel shading, bright vibrant colors, clean animation aesthetic, contemporary Japanese animation style",
    sampleImageUrl: `${_BASE}/style%20(7).png`,
    category: "illustration",
  },
  {
    id: "illust-anime-cinema",
    name: "シネマ風アニメ",
    description: "日常ドラマ的な映画クオリティのアニメ",
    stylePrompt: "cinematic anime style, slice-of-life drama atmosphere, realistic proportions, detailed everyday scene, animated film quality",
    sampleImageUrl: `${_BASE}/style%20(8).png`,
    category: "illustration",
  },
];

export const TEMPLATE_CATEGORY_LABELS: Record<ImageStyleTemplate["category"], string> = {
  illustration: "イラスト・アニメ",
};

export function getTemplateById(id: string): ImageStyleTemplate | undefined {
  return IMAGE_STYLE_TEMPLATES.find((t) => t.id === id);
}
