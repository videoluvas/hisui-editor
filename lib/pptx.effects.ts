// パワーポイントのアニメーション・画面切り替え → Shotstack の transition への対応表
// Shotstack のプリセット（transition / effect）で再現できるものだけ。キーフレームが必要なもの（強調・軌跡など）は対象外

export type PptxAnimation = {
  presetClass: string | null;   // entr | exit | emph | path ...
  presetId: number;
  presetSubtype: number;
  nodeType: string | null;
  start: number;                // ms（スライド開始から）
  duration: number;             // ms
};

export type PptxTransition = {
  types: string[];
  speed: string | null;
  duration: number | null;      // ms
  attrs: Record<string, string>;
};

type Dir = "Up" | "Down" | "Left" | "Right";

// presetSubtype の方向（1=上 2=右 4=下 8=左）。entr は「どこから入るか」、exit は「どこへ出るか」
const SUBTYPE_SIDE: Record<number, "top" | "right" | "bottom" | "left"> = { 1: "top", 2: "right", 4: "bottom", 8: "left" };

function slideDir(subtype: number, cls: "entr" | "exit"): Dir | null {
  const side = SUBTYPE_SIDE[subtype];
  if (!side) return null;
  if (cls === "entr") return ({ top: "Down", bottom: "Up", left: "Right", right: "Left" } as const)[side];
  return ({ top: "Up", bottom: "Down", left: "Left", right: "Right" } as const)[side];
}

function wipeDir(subtype: number, cls: "entr" | "exit"): "Left" | "Right" | null {
  const side = SUBTYPE_SIDE[subtype];
  if (side === "left") return cls === "entr" ? "Right" : "Left";
  if (side === "right") return cls === "entr" ? "Left" : "Right";
  return null;
}

function speedSuffix(ms: number | null | undefined): "" | "Fast" | "Slow" {
  if (!ms) return "";
  if (ms <= 600) return "Fast";
  if (ms >= 1500) return "Slow";
  return "";
}

// 取り込み画面の案内にも使う一覧
export const SUPPORTED_ANIMATIONS: { ids: number[]; label: string }[] = [
  { ids: [1],      label: "表示（アピール）" },
  { ids: [10, 9],  label: "フェード / ディゾルブ" },
  { ids: [2, 12, 7], label: "スライドイン（上下左右）" },
  { ids: [42, 47], label: "フロートイン / フロートアウト" },
  { ids: [26],     label: "バウンド（上からスライド）" },
  { ids: [22],     label: "ワイプ（左右。上下はリビール）" },
  { ids: [3, 4, 5, 6, 8, 13, 14, 16, 18, 20, 21], label: "ブラインド・ボックス・チェッカーボード・円・ひし形・プラス・ランダムストライプ・スプリット・ストリップ・くさび形・ホイール（リビール）" },
  { ids: [23, 53], label: "ズーム" },
];

export const SUPPORTED_TRANSITIONS: { types: string[]; label: string }[] = [
  { types: ["fade", "dissolve", "random"], label: "フェード / ディゾルブ" },
  { types: ["push"],  label: "プッシュ（カルーセル）" },
  { types: ["cover"], label: "カバー（スライド）" },
  { types: ["pull", "reveal"], label: "アンカバー / リビール" },
  { types: ["wipe"],  label: "ワイプ（左右。上下はリビール）" },
  { types: ["split", "blinds", "checker", "circle", "diamond", "plus", "wedge", "wheel", "randomBar", "strips"], label: "スプリット・ブラインド・チェッカーボード・円・ひし形・プラス・くさび形・ホイール・ランダムストライプ・ストリップ（リビール）" },
  { types: ["zoom"],  label: "ズーム" },
];

const SHAPE_REVEAL_IDS = new Set([3, 4, 5, 6, 8, 13, 14, 16, 18, 20, 21]);

// 戻り値: Shotstack の transition 名（"" は効果なしで表示/非表示だけ）。null は対応外
export function animationToTransition(a: PptxAnimation): string | null {
  const cls = a.presetClass === "entr" || a.presetClass === "exit" ? a.presetClass : null;
  if (!cls) return null;
  const sfx = speedSuffix(a.duration);
  if (SHAPE_REVEAL_IDS.has(a.presetId)) return `reveal${sfx}`;
  switch (a.presetId) {
    case 1:  return "";
    case 9:
    case 10: return `fade${sfx}`;
    case 2:
    case 7:
    case 12: { const d = slideDir(a.presetSubtype, cls); return d ? `slide${d}${sfx}` : `fade${sfx}`; }
    case 26: return `slide${cls === "entr" ? "Down" : "Up"}${sfx}`;
    case 42: return `slide${cls === "entr" ? "Up" : "Down"}${sfx}`;
    case 47: return `slide${cls === "entr" ? "Down" : "Up"}${sfx}`;
    case 22: { const d = wipeDir(a.presetSubtype, cls); return d ? `wipe${d}${sfx}` : `reveal${sfx}`; }
    case 23:
    case 53: return "zoom";
    default: return null;
  }
}

const TRANSITION_DIR: Record<string, Dir> = { l: "Left", r: "Right", u: "Up", d: "Down" };
const SHAPE_REVEAL_TRANSITIONS = new Set(["split", "blinds", "checker", "circle", "diamond", "plus", "wedge", "wheel", "randomBar", "strips", "pull", "reveal"]);

export function slideTransitionToTransition(t: PptxTransition): string | null {
  const ms = t.duration ?? (t.speed === "fast" ? 500 : t.speed === "slow" ? 1500 : null);
  const sfx = speedSuffix(ms);
  const dir = TRANSITION_DIR[t.attrs.dir ?? "l"];
  for (const type of t.types) {
    if (type === "cut") return "";
    if (type === "fade" || type === "dissolve" || type === "random") return `fade${sfx}`;
    if (type === "push") return dir ? `carousel${dir}${sfx}` : `fade${sfx}`;
    if (type === "cover") return dir ? `slide${dir}${sfx}` : `fade${sfx}`;
    if (type === "wipe") return dir === "Left" || dir === "Right" ? `wipe${dir}${sfx}` : `reveal${sfx}`;
    if (SHAPE_REVEAL_TRANSITIONS.has(type)) return `reveal${sfx}`;
    if (type === "zoom") return "zoom";
  }
  return null;
}

// ─── 取り込み時の既定アニメーション（Shotstack のプリセットすべて） ─────────────

export type SpeedSuffix = "" | "Fast" | "Slow";

export const DEFAULT_IN_GROUPS: { group: string; items: { value: string; label: string }[] }[] = [
  { group: "基本", items: [
    { value: "none",   label: "なし" },
    { value: "fade",   label: "フェード" },
    { value: "reveal", label: "リビール" },
    { value: "zoom",   label: "ズーム" },
  ] },
  { group: "スライド", items: [
    { value: "slideUp",    label: "下からスライド" },
    { value: "slideDown",  label: "上からスライド" },
    { value: "slideRight", label: "左からスライド" },
    { value: "slideLeft",  label: "右からスライド" },
  ] },
  { group: "ワイプ", items: [
    { value: "wipeRight", label: "左からワイプ" },
    { value: "wipeLeft",  label: "右からワイプ" },
  ] },
  { group: "カルーセル", items: [
    { value: "carouselUp",    label: "下からカルーセル" },
    { value: "carouselDown",  label: "上からカルーセル" },
    { value: "carouselRight", label: "左からカルーセル" },
    { value: "carouselLeft",  label: "右からカルーセル" },
  ] },
  { group: "シャッフル", items: [
    { value: "shuffleTopLeft",     label: "シャッフル（左上・上）" },
    { value: "shuffleLeftTop",     label: "シャッフル（左上・左）" },
    { value: "shuffleTopRight",    label: "シャッフル（右上・上）" },
    { value: "shuffleRightTop",    label: "シャッフル（右上・右）" },
    { value: "shuffleBottomLeft",  label: "シャッフル（左下・下）" },
    { value: "shuffleLeftBottom",  label: "シャッフル（左下・左）" },
    { value: "shuffleBottomRight", label: "シャッフル（右下・下）" },
    { value: "shuffleRightBottom", label: "シャッフル（右下・右）" },
  ] },
];

export const SPEEDS: { value: SpeedSuffix; label: string }[] = [
  { value: "Fast", label: "速い" },
  { value: "",     label: "標準" },
  { value: "Slow", label: "遅い" },
];

// 表示中ずっと続く動き（clip.effect）
export const DEFAULT_EFFECTS: { value: string; label: string }[] = [
  { value: "none",       label: "なし" },
  { value: "zoomIn",     label: "ゆっくりズームイン" },
  { value: "zoomOut",    label: "ゆっくりズームアウト" },
  { value: "slideLeft",  label: "左へ流れる" },
  { value: "slideRight", label: "右へ流れる" },
  { value: "slideUp",    label: "上へ流れる" },
  { value: "slideDown",  label: "下へ流れる" },
];

export const isDefaultIn = (v: unknown): v is string => DEFAULT_IN_GROUPS.some((g) => g.items.some((i) => i.value === v));
export const isDefaultEffect = (v: unknown): v is string => DEFAULT_EFFECTS.some((e) => e.value === v);
export const isSpeed = (v: unknown): v is SpeedSuffix => SPEEDS.some((s) => s.value === v);

// zoom だけは速さの指定がない
export function withSpeed(name: string, speed: SpeedSuffix): string {
  return name === "zoom" || name === "none" ? name : `${name}${speed}`;
}

export const STAGGER_SEC = 0.3;

// ─── 対象ごとの自動アニメーション（おすすめ設定・カスタマイズ共通の形） ───────

export type AnimTarget = "text" | "image" | "video" | "background";
export type AnimSetting = { in: string; speed: SpeedSuffix; effect: string };
export type AnimSettings = Record<AnimTarget, AnimSetting>;

export const ANIM_TARGETS: { value: AnimTarget; label: string }[] = [
  { value: "text",       label: "文字・図形" },
  { value: "image",      label: "埋め込み画像" },
  { value: "video",      label: "動画" },
  { value: "background", label: "背景" },
];

export const RECOMMENDED_ANIMATIONS: AnimSettings = {
  text:       { in: "fade",    speed: "Fast", effect: "none" },
  image:      { in: "slideUp", speed: "Fast", effect: "zoomIn" },
  video:      { in: "none",    speed: "",     effect: "none" },
  background: { in: "none",    speed: "",     effect: "none" },
};

// 送られてきた設定を検証し、不正な値はおすすめ設定に戻す
export function sanitizeAnimSettings(v: unknown): AnimSettings {
  const src = (v && typeof v === "object" ? v : {}) as Record<string, Partial<AnimSetting>>;
  const out = {} as AnimSettings;
  for (const { value: t } of ANIM_TARGETS) {
    const r = RECOMMENDED_ANIMATIONS[t];
    const s = src[t] ?? {};
    out[t] = {
      in: isDefaultIn(s.in) ? s.in : r.in,
      speed: isSpeed(s.speed) ? s.speed : r.speed,
      effect: isDefaultEffect(s.effect) ? s.effect : r.effect,
    };
  }
  return out;
}

const SPEED_LABEL: Record<SpeedSuffix, string> = { Fast: "速い", "": "標準", Slow: "遅い" };

export function describeIn(s: AnimSetting): string {
  const label = DEFAULT_IN_GROUPS.flatMap((g) => g.items).find((i) => i.value === s.in)?.label ?? "なし";
  return s.in === "none" || s.in === "zoom" ? label : `${label}（${SPEED_LABEL[s.speed]}）`;
}

export function describeEffect(s: AnimSetting): string {
  return DEFAULT_EFFECTS.find((e) => e.value === s.effect)?.label ?? "なし";
}
