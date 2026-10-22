export type MotionDirection = "Left" | "Right" | "Up" | "Down";
export type MotionSpeed     = "Slow" | "" | "Fast";

export type SceneEffectType = "none" | "zoom" | "slide";
export type SceneEffect = { type: SceneEffectType; variant: "In" | "Out"; direction: MotionDirection; speed: MotionSpeed };

export type SceneTransitionType = "none" | "fade" | "zoom" | "slide" | "wipe" | "carousel";
export type SceneTransition = { type: SceneTransitionType; direction: MotionDirection; speed: MotionSpeed };

export type SequenceMotion = { effect: SceneEffect; transitionIn: SceneTransition; transitionOut: SceneTransition };

export function readSequenceZoomStrength(edit: unknown): MotionSpeed {
  const zoom = visualClips(edit as AnyEdit).map((clip) => parseSceneEffect(clip.effect)).find((effect) => effect.type === "zoom");
  return zoom?.speed ?? "";
}

export function applySequenceZoomStrength<T>(edit: T, speed: MotionSpeed): T {
  const next = structuredClone(edit);
  for (const clip of visualClips(next as AnyEdit)) {
    const effect = parseSceneEffect(clip.effect);
    if (effect.type === "zoom") clip.effect = sceneEffectName({ ...effect, speed });
  }
  return next;
}
export type SequenceMotionDetails = {
  effect: Partial<Omit<SceneEffect, "type">>;
  transitionIn: Partial<Omit<SceneTransition, "type">>;
  transitionOut: Partial<Omit<SceneTransition, "type">>;
};

// Keep each clip's selected type and only update explicitly edited details.
export function applySequenceMotionDetails<T>(edit: T, details: SequenceMotionDetails): T {
  const next = structuredClone(edit);
  for (const clip of visualClips(next as AnyEdit)) {
    const effect = parseSceneEffect(clip.effect);
    if (effect.type !== "none" && Object.keys(details.effect).length) {
      clip.effect = sceneEffectName({ ...effect, ...details.effect });
    }
    for (const [key, patch] of [["in", details.transitionIn], ["out", details.transitionOut]] as const) {
      const transition = parseSceneTransition(clip.transition?.[key]);
      if (transition.type !== "none" && Object.keys(patch).length) {
        clip.transition = { ...clip.transition, [key]: sceneTransitionName({ ...transition, ...patch }) };
      }
    }
  }
  return next;
}

export const MOTION_SPEEDS: { value: MotionSpeed; label: string }[] = [
  { value: "Slow", label: "ゆっくり" },
  { value: "",     label: "標準" },
  { value: "Fast", label: "速い" },
];

export const MOTION_DIRECTIONS: { value: MotionDirection; label: string }[] = [
  { value: "Left",  label: "← 左" },
  { value: "Right", label: "→ 右" },
  { value: "Up",    label: "↑ 上" },
  { value: "Down",  label: "↓ 下" },
];

export const SCENE_EFFECT_TYPES: { value: SceneEffectType; label: string }[] = [
  { value: "none",  label: "なし" },
  { value: "zoom",  label: "ズーム" },
  { value: "slide", label: "スライド" },
];

export const SCENE_TRANSITION_TYPES: { value: SceneTransitionType; label: string }[] = [
  { value: "none",     label: "なし" },
  { value: "fade",     label: "フェード" },
  { value: "zoom",     label: "ズーム" },
  { value: "slide",    label: "スライド" },
  { value: "wipe",     label: "ワイプ" },
  { value: "carousel", label: "カルーセル" },
];

export const NO_EFFECT: SceneEffect = { type: "none", variant: "In", direction: "Left", speed: "" };
export const NO_TRANSITION: SceneTransition = { type: "none", direction: "Left", speed: "" };

export function transitionDirections(type: SceneTransitionType): MotionDirection[] {
  if (type === "slide" || type === "carousel") return ["Left", "Right", "Up", "Down"];
  if (type === "wipe") return ["Left", "Right"];
  return [];
}

export function transitionHasSpeed(type: SceneTransitionType): boolean {
  return type !== "none" && type !== "zoom";
}

export function sceneEffectName(e: SceneEffect): string | null {
  if (e.type === "zoom")  return `zoom${e.variant}${e.speed}`;
  if (e.type === "slide") return `slide${e.direction}${e.speed}`;
  return null;
}

export function sceneTransitionName(t: SceneTransition): string | null {
  if (t.type === "none") return null;
  if (t.type === "zoom") return "zoom";
  const dirs = transitionDirections(t.type);
  const dir = dirs.length ? (dirs.includes(t.direction) ? t.direction : dirs[0]) : "";
  return `${t.type}${dir}${t.speed}`;
}

export function parseSceneEffect(name: unknown): SceneEffect {
  const s = typeof name === "string" ? name : "";
  const zoom = s.match(/^zoom(In|Out)(Slow|Fast)?$/);
  if (zoom) return { ...NO_EFFECT, type: "zoom", variant: zoom[1] as "In" | "Out", speed: (zoom[2] ?? "") as MotionSpeed };
  const slide = s.match(/^slide(Left|Right|Up|Down)(Slow|Fast)?$/);
  if (slide) return { ...NO_EFFECT, type: "slide", direction: slide[1] as MotionDirection, speed: (slide[2] ?? "") as MotionSpeed };
  return { ...NO_EFFECT };
}

export function parseSceneTransition(name: unknown): SceneTransition {
  const s = typeof name === "string" ? name : "";
  if (s === "zoom") return { ...NO_TRANSITION, type: "zoom" };
  const m = s.match(/^(fade|slide|wipe|carousel)(Left|Right|Up|Down)?(Slow|Fast)?$/);
  if (!m) return { ...NO_TRANSITION };
  return { type: m[1] as SceneTransitionType, direction: (m[2] ?? "Left") as MotionDirection, speed: (m[3] ?? "") as MotionSpeed };
}

type AnyClip = Record<string, any>;
type AnyEdit = { timeline?: { tracks?: { clips?: AnyClip[] }[] } };

function visualClips(edit: AnyEdit): AnyClip[] {
  return (edit?.timeline?.tracks ?? []).flatMap((t) => t.clips ?? []).filter((c) => c?.asset?.type === "image" || c?.asset?.type === "video");
}

export function readSequenceMotion(edit: unknown): SequenceMotion {
  const c = visualClips(edit as AnyEdit)[0];
  return {
    effect:        parseSceneEffect(c?.effect),
    transitionIn:  parseSceneTransition(c?.transition?.in),
    transitionOut: parseSceneTransition(c?.transition?.out),
  };
}

export function countVisualClips(edit: unknown): number {
  return visualClips(edit as AnyEdit).length;
}

// 画像・動画クリップすべてに適用する。apply で指定した部分だけ書き換える
export function applySequenceMotion<T>(edit: T, motion: SequenceMotion, apply: { effect: boolean; transition: boolean }): T {
  const next = structuredClone(edit);
  const effect = sceneEffectName(motion.effect);
  const tIn = sceneTransitionName(motion.transitionIn);
  const tOut = sceneTransitionName(motion.transitionOut);
  for (const c of visualClips(next as AnyEdit)) {
    if (apply.effect) {
      if (effect) c.effect = effect; else delete c.effect;
    }
    if (apply.transition) {
      if (tIn || tOut) c.transition = { ...(tIn ? { in: tIn } : {}), ...(tOut ? { out: tOut } : {}) };
      else delete c.transition;
    }
  }
  return next;
}

export type OpenEditorBridge = {
  projectId: string | null;
  getEdit:   () => unknown;
  applyEdit: (edit: unknown) => Promise<void>;
};
