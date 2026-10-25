export const PPTX_MIME = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// ナレーションの前後に開ける秒数（おすすめ設定）
export const NARRATION_PAD_BEFORE = 0.5;
export const NARRATION_PAD_AFTER = 1;
export const clampPad = (v: unknown, def: number) => {
  const n = Number(v);
  return Math.min(10, Math.max(0, Math.round((v == null || !Number.isFinite(n) ? def : n) * 10) / 10));
};
