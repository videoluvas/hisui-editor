"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { saveGenMeta } from "@/lib/gen.meta";

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = "'Noto Sans JP', sans-serif";
const GRAD = "linear-gradient(45deg, #5184F0, #169385)";
const CANVAS_W = 1920;
const CANVAS_H = 1080;
const PREVIEW_TEXT = "あ a";

type FontOpt = { value: string; label: string };
const FONT_GROUPS: { group: string; fonts: FontOpt[] }[] = [
  {
    group: "ゴシック",
    fonts: [
      { value: "Noto Sans JP",            label: "Noto Sans JP（標準）" },
      { value: "BIZ UDPGothic",           label: "BIZ UDPゴシック（ビジネス）" },
      { value: "M PLUS 1p",               label: "M PLUS 1p（モダン）" },
      { value: "Zen Kaku Gothic New",      label: "Zen 角ゴシック New" },
      { value: "Zen Kaku Gothic Antique",  label: "Zen 角ゴシック Antique" },
      { value: "Murecho",                  label: "Murecho（シン・ゴシック）" },
    ],
  },
  {
    group: "明朝",
    fonts: [
      { value: "Noto Serif JP",            label: "Noto Serif JP" },
      { value: "BIZ UDMincho",             label: "BIZ UD明朝" },
      { value: "Shippori Mincho",          label: "しっぽり明朝" },
      { value: "Shippori Mincho B1",       label: "しっぽり明朝 B1（太め）" },
      { value: "Kaisei Decol",             label: "Kaisei Decol" },
      { value: "Kaisei HarunoUmi",         label: "Kaisei HarunoUmi" },
      { value: "Kaisei Tokumin",           label: "Kaisei Tokumin" },
      { value: "Zen Old Mincho",           label: "Zen Old Mincho（古典体）" },
      { value: "Yuji Syuku",               label: "Yuji Syuku（筆書き）" },
      { value: "Yuji Mai",                 label: "Yuji Mai（游字）" },
      { value: "Yomogi",                   label: "よもぎ（手書き）" },
      { value: "Klee One",                 label: "Klee One（教科書体）" },
      { value: "GenAKoburiMincho",         label: "源明朝（カスタム）" },
    ],
  },
  {
    group: "丸ゴシック・ポップ",
    fonts: [
      { value: "M PLUS Rounded 1c",       label: "M PLUS 丸ゴシック" },
      { value: "Hachi Maru Pop",           label: "はちまるポップ" },
      { value: "Kiwi Maru",               label: "キウィ丸" },
      { value: "Potta One",               label: "Potta One（丸太字）" },
    ],
  },
  {
    group: "インパクト・デザイン",
    fonts: [
      { value: "Dela Gothic One",          label: "Dela Gothic One（超極太）" },
      { value: "Rampart One",              label: "Rampart One（アウトライン）" },
      { value: "Reggae One",               label: "Reggae One" },
      { value: "Rocknroll One",            label: "RocknRoll One" },
      { value: "Stick",                    label: "Stick（スティック）" },
      { value: "Train One",               label: "Train One（工業系）" },
      { value: "DotGothic16",             label: "ドットゴシック16（レトロ）" },
      { value: "Impact",                  label: "Impact（英字）" },
    ],
  },
  {
    group: "システム",
    fonts: [
      { value: "serif",                    label: "serif（明朝系）" },
      { value: "sans-serif",              label: "sans-serif（ゴシック系）" },
    ],
  },
];


// ─── Types ────────────────────────────────────────────────────────────────────

type BgMode  = "dark" | "light" | "transparent";
type Align   = "left" | "center" | "right";
type FillKind   = "solid" | "linear" | "radial" | "4color";
type StrokeKind = "edge" | "depth";

type StrokeItem = {
  id: string;
  kind: StrokeKind;
  fillKind: "solid" | "linear";
  color: string;  opacity: number;
  color2: string; opacity2: number;
  gradAngle: number;
  gradWidth: number;
  width: number;
  depthAngle: number;
  depthLen: number;
};

type ShadowSettings = {
  enabled: boolean; color: string; opacity: number; blur: number; x: number; y: number;
};

type BgSettings = {
  enabled: boolean; color: string; opacity: number; paddingX: number; paddingY: number; radius: number;
};

type GlowSettings = {
  enabled: boolean;
  color: string;
  opacity: number;   // 0–100
  blur: number;      // 0–80
  strength: number;  // 1–10
};

type GlossSettings = {
  enabled: boolean;
  intensity: number; // 0–100
  size: number;      // 0–100 (テキスト高に対する光沢エリア%)
  angle: number;     // 0–360; 0=right, 90=down (default), 180=left, 270=up
};

type TextureSettings = {
  enabled: boolean;
  src: string;       // dataURL or R2 URL
  opacity: number;   // 0–100
  scale: number;     // 10–500 (%)
};

export type DecoSettings = {
  text: string; fontFamily: string; fontSize: number; bold: boolean; italic: boolean; align: Align;
  letterSpacing: number;  // px (-20 to 200)
  lineHeight: number;     // multiplier (0.8 to 4.0)
  textYPct: number;  // vertical center 0–100 (% of canvas height)
  textXPct: number;  // horizontal edge offset 0–50 (% of canvas width from edge for left/right align)
  fillKind: FillKind;
  fillColor: string;  fillOpacity: number;   // primary / TL
  fillColor2: string; fillOpacity2: number;  // gradient end / TR
  fillAngle: number;                          // gradient direction
  fillColor3: string; fillOpacity3: number;  // 4color BR
  fillColor4: string; fillOpacity4: number;  // 4color BL
  gloss: GlossSettings;
  texture: TextureSettings;
  outerStrokes: StrokeItem[];
  shadow: ShadowSettings;
  glow: GlowSettings;
  bg: BgSettings;
};

type Preset = DecoSettings & { label: string; previewBg: string };

type StyleSettings = Omit<DecoSettings, "text">;

type UserPreset = {
  id: string;
  name: string;
  settings: StyleSettings;
  sortOrder: number;
};

// ─── Presets ─────────────────────────────────────────────────────────────────

const DEF_SHADOW: ShadowSettings   = { enabled: false, color: "#000000", opacity: 80, blur: 12, x: 2, y: 4 };
const DEF_BG: BgSettings           = { enabled: false, color: "#000000", opacity: 50, paddingX: 24, paddingY: 10, radius: 8 };
const DEF_GLOSS: GlossSettings     = { enabled: false, intensity: 60, size: 45, angle: 90 };
const DEF_TEXTURE: TextureSettings = { enabled: false, src: "", opacity: 100, scale: 100 };
const DEF_GLOW: GlowSettings       = { enabled: false, color: "#ffffff", opacity: 100, blur: 30, strength: 3 };

function defStroke(id: string, color: string, width: number): StrokeItem {
  return { id, kind: "edge", fillKind: "solid", color, opacity: 100, color2: "#000000", opacity2: 100, gradAngle: 0, gradWidth: 100, width, depthAngle: 135, depthLen: 4 };
}

function makePreset(label: string, previewBg: string, overrides: Partial<DecoSettings>): Preset {
  return {
    label, previewBg, text: "テロップ", fontFamily: "Noto Sans JP", fontSize: 96,
    bold: true, italic: false, align: "center",
    letterSpacing: 0, lineHeight: 1.25,
    textYPct: 82, textXPct: 50,
    fillKind: "solid",
    fillColor: "#ffffff", fillOpacity: 100,
    fillColor2: "#000000", fillOpacity2: 100,
    fillAngle: 90,
    fillColor3: "#000000", fillOpacity3: 100,
    fillColor4: "#000000", fillOpacity4: 100,
    gloss: { ...DEF_GLOSS }, texture: { ...DEF_TEXTURE },
    outerStrokes: [],
    shadow: { ...DEF_SHADOW }, glow: { ...DEF_GLOW }, bg: { ...DEF_BG },
    ...overrides,
  };
}

const PRESETS: Preset[] = [
  makePreset("白・縁取り",   "#000",    { fillColor: "#ffffff", outerStrokes: [defStroke("o1", "#000000", 6)] }),
  makePreset("黄・縁取り",   "#000",    { fillColor: "#ffee00", outerStrokes: [defStroke("o1", "#000000", 6)] }),
  makePreset("白・影",       "#000",    { fillColor: "#ffffff", shadow: { ...DEF_SHADOW, enabled: true, blur: 16, x: 0, y: 0 } }),
  makePreset("黒・白縁",     "#fff",    { fillColor: "#000000", outerStrokes: [defStroke("o1", "#ffffff", 6)] }),
  makePreset("赤・縁取り",   "#000",    { fillColor: "#ff3333", outerStrokes: [defStroke("o1", "#000000", 6)] }),
  makePreset("ゴールド",     "#000",    { fillColor: "#ffd700", outerStrokes: [defStroke("o1", "#7a5200", 4)], shadow: { ...DEF_SHADOW, enabled: true, color: "#7a5200", blur: 8, x: 2, y: 2, opacity: 70 } }),
  makePreset("ゴールド光沢", "#000",    { fillColor: "#ffd700", outerStrokes: [defStroke("o1", "#7a5200", 4)], gloss: { enabled: true, intensity: 70, size: 50, angle: 90 } }),
  makePreset("ネオン青",     "#0a0a1a", { fillColor: "#00eeff", outerStrokes: [defStroke("o1", "#0077cc", 3)], shadow: { ...DEF_SHADOW, enabled: true, color: "#00ccff", blur: 20, x: 0, y: 0, opacity: 100 } }),
  makePreset("白・ドロップ", "#1a1a2e", { fillColor: "#ffffff", shadow: { ...DEF_SHADOW, enabled: true, color: "#000000", blur: 4, x: 3, y: 4, opacity: 90 } }),
  makePreset("白・背景",     "#000",    { fillColor: "#ffffff", bg: { ...DEF_BG, enabled: true, color: "#000000", opacity: 60 } }),
  makePreset("白・細縁",     "#000",    { fillColor: "#ffffff", outerStrokes: [defStroke("o1", "#000000", 3)] }),
  makePreset("白・太縁",     "#000",    { fillColor: "#ffffff", outerStrokes: [defStroke("o1", "#000000", 10)] }),
  makePreset("オレンジ",     "#000",    { fillColor: "#ff8c00", outerStrokes: [defStroke("o1", "#000000", 5)] }),
  makePreset("シアン・縁",   "#000",    { fillColor: "#00ffcc", outerStrokes: [defStroke("o1", "#004433", 5)] }),
  makePreset("エレガント",   "#1a1a1a", { fillColor: "#f0e6c8", fontFamily: "serif", bold: false, italic: true, shadow: { ...DEF_SHADOW, enabled: true, color: "#000000", blur: 12, x: 2, y: 2, opacity: 70 } }),
  makePreset("二重縁取り",   "#000",    { fillColor: "#ffffff", outerStrokes: [defStroke("o1", "#000000", 8), defStroke("o2", "#ffee00", 4)] }),
];

// ─── Canvas drawing ───────────────────────────────────────────────────────────

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function makeGradStyle(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  kind: "linear" | "radial", angle: number,
  c1: string, o1: number, c2: string, o2: number,
  gradWidth = 100,
): CanvasGradient {
  if (kind === "radial") {
    const r = Math.max(W, H) * 0.7;
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
    g.addColorStop(0, hexToRgba(c1, o1 / 100));
    g.addColorStop(1, hexToRgba(c2, o2 / 100));
    return g;
  }
  const rad = angle * Math.PI / 180;
  const dx = Math.cos(rad), dy = Math.sin(rad);
  const len = Math.sqrt(W * W + H * H) / 2;
  const g = ctx.createLinearGradient(W / 2 - dx * len, H / 2 - dy * len, W / 2 + dx * len, H / 2 + dy * len);
  // gradWidth: 0=くっきり境界 / 100=なだらかなグラデーション
  const half = Math.max(0, Math.min(100, gradWidth)) / 200;
  const s1 = Math.max(0, 0.5 - half);
  const s2 = Math.min(1, 0.5 + half);
  g.addColorStop(0,  hexToRgba(c1, o1 / 100));
  g.addColorStop(s1, hexToRgba(c1, o1 / 100));
  g.addColorStop(s2, hexToRgba(c2, o2 / 100));
  g.addColorStop(1,  hexToRgba(c2, o2 / 100));
  return g;
}

function draw4ColorGrad(
  ctx: CanvasRenderingContext2D, W: number, H: number,
  c1: string, o1: number, c2: string, o2: number,
  c3: string, o3: number, c4: string, o4: number,
): void {
  const tmp = document.createElement("canvas");
  tmp.width = 2; tmp.height = 2;
  const tc = tmp.getContext("2d")!;
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  const [r3, g3, b3] = hexToRgb(c3);
  const [r4, g4, b4] = hexToRgb(c4);
  const img = tc.createImageData(2, 2);
  const d = img.data;
  d[0]  = r1; d[1]  = g1; d[2]  = b1; d[3]  = Math.round(o1 / 100 * 255); // TL (0,0)
  d[4]  = r2; d[5]  = g2; d[6]  = b2; d[7]  = Math.round(o2 / 100 * 255); // TR (1,0)
  d[8]  = r4; d[9]  = g4; d[10] = b4; d[11] = Math.round(o4 / 100 * 255); // BL (0,1)
  d[12] = r3; d[13] = g3; d[14] = b3; d[15] = Math.round(o3 / 100 * 255); // BR (1,1)
  tc.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(tmp, 0, 0, W, H);
  ctx.restore();
}


function drawCheckerboard(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const sz = Math.max(16, Math.round(w / 60));
  for (let y = 0; y < h; y += sz)
    for (let x = 0; x < w; x += sz) {
      ctx.fillStyle = ((x / sz + y / sz) % 2 === 0) ? "#c0c0c0" : "#f0f0f0";
      ctx.fillRect(x, y, sz, sz);
    }
}

function getTextLines(text: string): string[] {
  const lines = text ? text.split("\n") : [];
  return lines.length > 0 ? lines : [" "];
}
function getLineH(fontSize: number, lineHeight = 1.25): number { return fontSize * lineHeight; }
function getLineY(cy: number, idx: number, total: number, fontSize: number, lineHeight = 1.25): number {
  const lh = getLineH(fontSize, lineHeight);
  return cy - (lh * total) / 2 + lh * idx + lh / 2;
}

function applyFont(ctx: CanvasRenderingContext2D, s: DecoSettings) {
  ctx.font = `${s.italic ? "italic " : ""}${s.bold ? "bold " : ""}${s.fontSize}px "${s.fontFamily}", sans-serif`;
  (ctx as any).letterSpacing = (s.letterSpacing ?? 0) + "px";
  ctx.textBaseline = "middle";
  ctx.textAlign = s.align;
}

function textX(s: DecoSettings, w: number) {
  return w * (s.textXPct ?? 50) / 100;
}

function buildFillLayer(
  W: number, H: number, s: DecoSettings, x: number, y: number,
  textureImg: HTMLImageElement | null,
): HTMLCanvasElement {
  // Step 1: テキスト形状マスク（白で文字を描くだけ）
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = W; maskCanvas.height = H;
  const mc = maskCanvas.getContext("2d")!;
  applyFont(mc, s);
  mc.fillStyle = "#fff";
  const _mLines = getTextLines(s.text);
  _mLines.forEach((ln, li) => mc.fillText(ln, x, getLineY(y, li, _mLines.length, s.fontSize, s.lineHeight ?? 1.25)));

  // Step 2: コンテンツキャンバスに塗り＋テクスチャを全面で重ねる
  const cc = document.createElement("canvas");
  cc.width = W; cc.height = H;
  const c = cc.getContext("2d")!;

  // Fill by kind
  switch (s.fillKind ?? "solid") {
    case "solid":
      if (s.fillOpacity > 0) {
        c.fillStyle = hexToRgba(s.fillColor, s.fillOpacity / 100);
        c.fillRect(0, 0, W, H);
      }
      break;
    case "linear":
    case "radial":
      c.fillStyle = makeGradStyle(c, W, H, s.fillKind as "linear" | "radial", s.fillAngle ?? 90, s.fillColor, s.fillOpacity, s.fillColor2 ?? s.fillColor, s.fillOpacity2 ?? s.fillOpacity);
      c.fillRect(0, 0, W, H);
      break;
    case "4color":
      draw4ColorGrad(c, W, H, s.fillColor, s.fillOpacity, s.fillColor2 ?? "#000", s.fillOpacity2 ?? 100, s.fillColor3 ?? "#000", s.fillOpacity3 ?? 100, s.fillColor4 ?? "#000", s.fillOpacity4 ?? 100);
      break;
  }

  if (s.texture.enabled && textureImg) {
    const nw = textureImg.naturalWidth;
    const nh = textureImg.naturalHeight;
    if (nw > 0 && nh > 0) {
      const sc = Math.max(0.01, s.texture.scale / 100);
      const tw = nw * sc;
      const th = nh * sc;
      c.globalAlpha = s.texture.opacity / 100;
      for (let row = 0; row * th < H + th; row++) {
        for (let col = 0; col * tw < W + tw; col++) {
          c.drawImage(textureImg, col * tw, row * th, tw, th);
        }
      }
      c.globalAlpha = 1;
    }
  }

  // Step 3: destination-in でマスクキャンバスのテキスト形状に切り抜く
  c.globalCompositeOperation = "destination-in";
  c.drawImage(maskCanvas, 0, 0);
  c.globalCompositeOperation = "source-over";

  // Step 4: 光沢（source-atop でテキスト形状にクリップ）
  if (s.gloss.enabled) {
    c.globalCompositeOperation = "source-atop";
    const rad = (s.gloss.angle ?? 90) * Math.PI / 180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    const halfLen = s.fontSize * 0.7;
    const gx1 = W / 2 - dx * halfLen, gy1 = y - dy * halfLen;
    const gx2 = W / 2 + dx * halfLen, gy2 = y + dy * halfLen;
    const grad = c.createLinearGradient(gx1, gy1, gx2, gy2);
    grad.addColorStop(0,   hexToRgba("#ffffff", s.gloss.intensity / 100));
    grad.addColorStop(0.4, hexToRgba("#ffffff", s.gloss.intensity * 0.3 / 100));
    grad.addColorStop(1,   "rgba(255,255,255,0)");
    c.fillStyle = grad;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "source-over";
  }

  return cc;
}

function drawOnCanvas(
  canvas: HTMLCanvasElement,
  s: DecoSettings,
  previewBg: BgMode | string,
  textureImg?: HTMLImageElement | null,
  bgImg?: HTMLImageElement | null,
  forExport = false,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width: W, height: H } = canvas;
  ctx.clearRect(0, 0, W, H);

  // ── 背景 ──
  if (!forExport) {
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, W, H);
    } else if (previewBg === "transparent") {
      drawCheckerboard(ctx, W, H);
    } else {
      ctx.fillStyle = typeof previewBg === "string" && previewBg.startsWith("#") ? previewBg
        : previewBg === "dark" ? "#1e293b" : "#f8fafc";
      ctx.fillRect(0, 0, W, H);
    }
  }

  applyFont(ctx, s);
  const x = textX(s, W);
  const y = H * ((s.textYPct ?? 82) / 100);

  // ── テキスト背景矩形 ──
  const allLines = getTextLines(s.text);
  if (s.bg.enabled) {
    let maxW = 0;
    for (const ln of allLines) { const mw = ctx.measureText(ln || " ").width; if (mw > maxW) maxW = mw; }
    const tw = maxW;
    const th = getLineH(s.fontSize, s.lineHeight ?? 1.25) * allLines.length;
    const bx = x - (s.align === "center" ? tw / 2 : s.align === "right" ? tw : 0) - s.bg.paddingX;
    const by = y - th / 2 - s.bg.paddingY;
    ctx.fillStyle = hexToRgba(s.bg.color, s.bg.opacity / 100);
    ctx.beginPath();
    ctx.roundRect(bx, by, tw + s.bg.paddingX * 2, th + s.bg.paddingY * 2, s.bg.radius);
    ctx.fill();
  }

  // ── 光彩（外側グロー）──
  if (s.glow?.enabled) {
    ctx.save();
    const glowRgba = hexToRgba(s.glow.color, s.glow.opacity / 100);
    ctx.shadowColor   = glowRgba;
    ctx.shadowBlur    = s.glow.blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle     = glowRgba;
    applyFont(ctx, s);
    const glowStrength = Math.max(1, Math.min(10, s.glow.strength));
    for (let _gi = 0; _gi < glowStrength; _gi++) {
      allLines.forEach((ln, li) => ctx.fillText(ln, x, getLineY(y, li, allLines.length, s.fontSize, s.lineHeight ?? 1.25)));
    }
    ctx.restore();
  }

  // ── ストロークレイヤーシステム ──
  // インデックス0が最内側（テキストに最も近い）、末尾が最外側
  // depth stroke は位置セットを拡張し、後続 edge stroke がそれらすべてを包む
  {
    const strokes = s.outerStrokes;
    const MAX_POS = 50; // パフォーマンスキャップ

    // offsetSets[i] = stroke[i] 適用前の形状位置セット (絶対オフセット)
    const offsetSets: Array<[number, number][]> = [[[0, 0]]];
    for (let i = 0; i < strokes.length; i++) {
      const st = strokes[i];
      if ((st.kind ?? "edge") === "depth") {
        const rad = st.depthAngle * Math.PI / 180;
        const ddx = Math.cos(rad), ddy = Math.sin(rad);
        const L = Math.max(1, Math.min(20, st.depthLen));
        const prev = offsetSets[i];
        const next: [number, number][] = [];
        for (const [ox, oy] of prev) {
          next.push([ox, oy]);
          for (let k = 1; k <= L && next.length < MAX_POS; k++) {
            next.push([ox + ddx * k, oy + ddy * k]);
          }
          if (next.length >= MAX_POS) break;
        }
        offsetSets.push(next);
      } else {
        offsetSets.push(offsetSets[i]); // edge は位置を拡張しない
      }
    }

    // 各ストロークの累積 edge 幅 (edge strokes のみ加算)
    const accEdgeWidths: number[] = [];
    let cumEdgeW = 0;
    for (const st of strokes) {
      if ((st.kind ?? "edge") !== "depth") cumEdgeW += st.width;
      accEdgeWidths.push(cumEdgeW);
    }

    applyFont(ctx, s);

    // 影: 全ストローク・塗りより前に描画して最下層に配置
    if (s.shadow.enabled) {
      ctx.save();
      ctx.shadowColor   = hexToRgba(s.shadow.color, s.shadow.opacity / 100);
      ctx.shadowBlur    = s.shadow.blur;
      ctx.shadowOffsetX = s.shadow.x;
      ctx.shadowOffsetY = s.shadow.y;
      const totalEdgeW = accEdgeWidths.length > 0 ? accEdgeWidths[accEdgeWidths.length - 1] : 0;
      if (totalEdgeW > 0) {
        ctx.lineWidth   = 2 * totalEdgeW;
        ctx.lineJoin    = "round";
        ctx.strokeStyle = "#000";
        allLines.forEach((ln, li) =>
          ctx.strokeText(ln, x, getLineY(y, li, allLines.length, s.fontSize, s.lineHeight ?? 1.25))
        );
      } else {
        ctx.fillStyle = "#000";
        allLines.forEach((ln, li) =>
          ctx.fillText(ln || " ", x, getLineY(y, li, allLines.length, s.fontSize, s.lineHeight ?? 1.25))
        );
      }
      ctx.restore();
    }

    // 外→内の順にレンダリング: 外側のストロークを先に描き、内側で上書き
    for (let i = strokes.length - 1; i >= 0; i--) {
      const st = strokes[i];
      const positions = offsetSets[i]; // このストロークが適用される前の位置セット

      if ((st.kind ?? "edge") === "depth") {
        // デプスストローク: 各位置からコピーを奥→手前の順に描画
        const rad = st.depthAngle * Math.PI / 180;
        // 整数ピクセルに丸める（小数座標だとサブピクセルAAでぼける）
        const ddx = Math.round(Math.cos(rad) * 100) / 100;
        const ddy = Math.round(Math.sin(rad) * 100) / 100;
        const L = Math.max(1, Math.min(20, st.depthLen));

        // このdepthより前にある edge stroke インデックス（外→内の順）
        const innerEdgeIdxs: number[] = [];
        for (let j = i - 1; j >= 0; j--) {
          if ((strokes[j].kind ?? "edge") !== "depth") innerEdgeIdxs.push(j);
        }

        for (let k = L; k >= 1; k--) {
          const baseAlpha = st.opacity / 100;
          for (const [ox, oy] of positions) {
            // 整数座標に丸めてサブピクセルぼけを防ぐ
            const px    = Math.round(x  + ox + ddx * k);
            const pyOff = Math.round(oy + ddy * k);

            // 奥行きコピー: エッジの幅を形状として使い、色は奥行き色に統一
            // （エッジ色でアウトラインを描くと奥行き色が見えなくなるため）
            if (innerEdgeIdxs.length > 0) {
              const outerEdgeW = accEdgeWidths[innerEdgeIdxs[0]];
              ctx.lineWidth = 2 * outerEdgeW;
              ctx.lineJoin  = "round";
              if (st.fillKind !== "solid") {
                ctx.strokeStyle = makeGradStyle(ctx, W, H, st.fillKind, st.gradAngle, st.color, st.opacity, st.color2, st.opacity2, st.gradWidth ?? 100);
              } else {
                ctx.strokeStyle = hexToRgba(st.color, baseAlpha);
              }
              allLines.forEach((ln, li) =>
                ctx.strokeText(ln, px, getLineY(y, li, allLines.length, s.fontSize, s.lineHeight ?? 1.25) + pyOff)
              );
            }

            // 奥行き塗り（奥→手前で上書きされ立体感が出る）
            if (st.fillKind !== "solid") {
              ctx.fillStyle = makeGradStyle(ctx, W, H, st.fillKind, st.gradAngle, st.color, st.opacity, st.color2, st.opacity2, st.gradWidth ?? 100);
            } else {
              ctx.fillStyle = hexToRgba(st.color, baseAlpha);
            }
            allLines.forEach((ln, li) =>
              ctx.fillText(ln || " ", px, getLineY(y, li, allLines.length, s.fontSize, s.lineHeight ?? 1.25) + pyOff)
            );
          }
        }
        ctx.globalAlpha = 1;
      } else {
        // エッジストローク: 累積幅で全位置に strokeText
        const lw = 2 * accEdgeWidths[i];
        if (st.fillKind === "linear") {
          ctx.strokeStyle = makeGradStyle(ctx, W, H, st.fillKind, st.gradAngle, st.color, st.opacity, st.color2, st.opacity2, st.gradWidth ?? 100);
        } else {
          ctx.strokeStyle = hexToRgba(st.color, st.opacity / 100);
        }
        ctx.lineWidth = lw;
        ctx.lineJoin  = "round";
        for (const [ox, oy] of positions) {
          allLines.forEach((ln, li) =>
            ctx.strokeText(ln, x + ox, getLineY(y, li, allLines.length, s.fontSize, s.lineHeight ?? 1.25) + oy)
          );
        }
      }
    }
  }

  // ── 塗りレイヤー（オフスクリーン）をメインCanvasに合成 ──
  const fillLayer = buildFillLayer(W, H, s, x, y, textureImg ?? null);

  ctx.drawImage(fillLayer, 0, 0);

}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean; position: number; workspaceId?: string | null;
  onCaptureFrame?: () => Promise<string | null>;
  onClose: () => void;
  onInsert: (asset: { type: "image"; src: string }, start: number) => void;
  onUpdate?: (asset: { type: "image"; src: string }, oldSrc: string) => void;
  initialData?: DecoSettings;
  existingFileUrl?: string;
  onGenerated?: (fileUrl: string, settings: DecoSettings) => void;
};

type WorkspaceFile = { id: string; fileUrl: string; fileName: string; fileType: string };

// ─── Main component ───────────────────────────────────────────────────────────

export default function EditorDecoTelopModal({ open, position, workspaceId, onCaptureFrame, onClose, onInsert, onUpdate, initialData, existingFileUrl, onGenerated }: Props) {
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const textureImgRef = useRef<HTMLImageElement | null>(null);
  const bgImgRef      = useRef<HTMLImageElement | null>(null);

  const [text, setText]             = useState("テロップテキスト");
  const [fontFamily, setFontFamily] = useState("Noto Sans JP");
  const [fontSize, setFontSize]     = useState(96);
  const [bold, setBold]             = useState(true);
  const [italic, setItalic]         = useState(false);
  const [align, setAlign]           = useState<Align>("center");
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight]       = useState(1.25);
  const [fillColor, setFillColor]   = useState("#ffffff");
  const [fillOpacity, setFillOpacity] = useState(100);
  const [fillKind, setFillKind]     = useState<FillKind>("solid");
  const [fillColor2, setFillColor2] = useState("#000000");
  const [fillOpacity2, setFillOpacity2] = useState(100);
  const [fillAngle, setFillAngle]   = useState(90);
  const [fillColor3, setFillColor3] = useState("#000000");
  const [fillOpacity3, setFillOpacity3] = useState(100);
  const [fillColor4, setFillColor4] = useState("#000000");
  const [fillOpacity4, setFillOpacity4] = useState(100);
  const [textYPct, setTextYPct]     = useState(50);
  const [textXPct, setTextXPct]     = useState(50);
  const [showSafeArea, setShowSafeArea]       = useState(false);
  const [safeMarginV, setSafeMarginV]         = useState(10);
  const [safeMarginH, setSafeMarginH]         = useState(10);
  const [safeSettingsOpen, setSafeSettingsOpen] = useState(false);
  const [gloss, setGloss]           = useState<GlossSettings>({ ...DEF_GLOSS });
  const [texture, setTexture]       = useState<TextureSettings>({ ...DEF_TEXTURE });
  const [textureImgLoaded, setTextureImgLoaded] = useState(false);
  const [outerStrokes, setOuterStrokes] = useState<StrokeItem[]>([defStroke("o1", "#000000", 6)]);
  const [shadow, setShadow]         = useState<ShadowSettings>({ ...DEF_SHADOW });
  const [glow, setGlow]             = useState<GlowSettings>({ ...DEF_GLOW });
  const [bg, setBg]                 = useState<BgSettings>({ ...DEF_BG });
  const [previewBg, setPreviewBg]   = useState<BgMode>("transparent");
  const [frameAsBg, setFrameAsBg]   = useState(false);
  const [bgImgLoaded, setBgImgLoaded] = useState(false);
  const [capturingFrame, setCapturingFrame] = useState(false);
  const [isEditingText, setIsEditingText]     = useState(false);
  const [overlayFontSize, setOverlayFontSize] = useState(20);
  const [overlayTextWidth, setOverlayTextWidth] = useState(100);
  const textEditRef = useRef<HTMLTextAreaElement>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [userPresets, setUserPresets] = useState<UserPreset[]>([]);
  const [selectedUserPresetId, setSelectedUserPresetId] = useState<string | null>(null);
  const [undoSnapshot, setUndoSnapshot] = useState<StyleSettings | null>(null);
  const [saveInputOpen, setSaveInputOpen]   = useState(false);
  const [savePresetName, setSavePresetName] = useState("");
  const [savingPreset, setSavingPreset]     = useState(false);
  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null);
  const [renameValue, setRenameValue]       = useState("");
  const [draggingId, setDraggingId]         = useState<string | null>(null);
  const [dragOverId, setDragOverId]         = useState<string | null>(null);
  const [inserting, setInserting]   = useState(false);
  const [error, setError]           = useState("");
  const [filePickerOpen, setFilePickerOpen] = useState(false);
  const [workspaceFiles, setWorkspaceFiles] = useState<WorkspaceFile[]>([]);
  const [filesLoading, setFilesLoading]     = useState(false);

  // initialData が渡されたとき（ファイルダブルクリックからの再編集）に設定を復元
  useEffect(() => {
    if (!open || !initialData) return;
    setText(initialData.text);
    setFontFamily(initialData.fontFamily);
    setFontSize(initialData.fontSize);
    setBold(initialData.bold);
    setItalic(initialData.italic);
    setAlign(initialData.align);
    setLetterSpacing(initialData.letterSpacing ?? 0);
    setLineHeight(initialData.lineHeight ?? 1.25);
    setTextYPct(initialData.textYPct);
    setTextXPct(initialData.textXPct);
    setFillKind(initialData.fillKind);
    setFillColor(initialData.fillColor);
    setFillOpacity(initialData.fillOpacity);
    setFillColor2(initialData.fillColor2);
    setFillOpacity2(initialData.fillOpacity2);
    setFillAngle(initialData.fillAngle);
    setFillColor3(initialData.fillColor3);
    setFillOpacity3(initialData.fillOpacity3);
    setFillColor4(initialData.fillColor4);
    setFillOpacity4(initialData.fillOpacity4);
    setGloss(initialData.gloss);
    setTexture(initialData.texture);
    setOuterStrokes(initialData.outerStrokes);
    setShadow(initialData.shadow);
    setGlow(initialData.glow);
    setBg(initialData.bg);
  }, [open]);

  // テクスチャ src が変わったら HTMLImageElement をロード
  useEffect(() => {
    if (!texture.src) { textureImgRef.current = null; setTextureImgLoaded(false); return; }
    const img = new Image();
    img.onload  = () => { textureImgRef.current = img; setTextureImgLoaded(true); };
    img.onerror = () => { textureImgRef.current = null; setTextureImgLoaded(false); };
    img.src = texture.src;
  }, [texture.src]);

  const loadBgFromUrl = useCallback((url: string) => {
    const img = new Image();
    img.onload  = () => { bgImgRef.current = img; setBgImgLoaded(true); setFrameAsBg(true); };
    img.onerror = () => { bgImgRef.current = null; setBgImgLoaded(false); };
    img.src = url;
  }, []);

  const getSettings = useCallback((): DecoSettings => ({
    text, fontFamily, fontSize, bold, italic, align,
    letterSpacing, lineHeight,
    textYPct, textXPct,
    fillKind, fillColor, fillOpacity,
    fillColor2, fillOpacity2, fillAngle,
    fillColor3, fillOpacity3,
    fillColor4, fillOpacity4,
    gloss, texture,
    outerStrokes, shadow, glow, bg,
  }), [text, fontFamily, fontSize, bold, italic, align,
    letterSpacing, lineHeight,
    textYPct, textXPct,
    fillKind, fillColor, fillOpacity,
    fillColor2, fillOpacity2, fillAngle,
    fillColor3, fillOpacity3,
    fillColor4, fillOpacity4,
    gloss, texture, outerStrokes, shadow, glow, bg]);

  // メインCanvas再描画
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !open) return;
    const load = async () => {
      try { await document.fonts.load(`bold ${fontSize}px "${fontFamily}"`); } catch { /* ok */ }
      drawOnCanvas(canvas, getSettings(), previewBg, textureImgRef.current, frameAsBg ? bgImgRef.current : null);
    };
    load();
  }, [open, getSettings, previewBg, frameAsBg, fontFamily, fontSize, letterSpacing, lineHeight, textureImgLoaded, bgImgLoaded]);

  const applyStyleSettings = (s: StyleSettings) => {
    setFontFamily(s.fontFamily); setFontSize(s.fontSize);
    setBold(s.bold); setItalic(s.italic); setAlign(s.align);
    setLetterSpacing(s.letterSpacing ?? 0); setLineHeight(s.lineHeight ?? 1.25);
    setTextYPct(s.textYPct ?? 82); setTextXPct(s.textXPct ?? 50);
    setFillKind(s.fillKind ?? "solid");
    setFillColor(s.fillColor); setFillOpacity(s.fillOpacity);
    setFillColor2(s.fillColor2 ?? "#000000"); setFillOpacity2(s.fillOpacity2 ?? 100);
    setFillAngle(s.fillAngle ?? 90);
    setFillColor3(s.fillColor3 ?? "#000000"); setFillOpacity3(s.fillOpacity3 ?? 100);
    setFillColor4(s.fillColor4 ?? "#000000"); setFillOpacity4(s.fillOpacity4 ?? 100);
    setGloss({ ...s.gloss }); setTexture({ ...s.texture });
    setOuterStrokes(s.outerStrokes.map(st => ({ ...st })));
    setShadow({ ...s.shadow });
    setGlow({ ...(s.glow ?? DEF_GLOW) });
    setBg({ ...s.bg });
  };

  const applyPreset = (i: number) => {
    const p = PRESETS[i];
    setText(p.text);
    applyStyleSettings(p);
    setSelectedPreset(i);
    setSelectedUserPresetId(null);
  };

  const applyUserPreset = (up: UserPreset) => {
    setUndoSnapshot(getStyleSettings());
    applyStyleSettings(up.settings as StyleSettings);
    setSelectedPreset(null);
    setSelectedUserPresetId(up.id);
  };

  const handleUndo = useCallback(() => {
    if (!undoSnapshot) return;
    applyStyleSettings(undoSnapshot);
    setUndoSnapshot(null);
    setSelectedUserPresetId(null);
    setSelectedPreset(null);
  }, [undoSnapshot]); // eslint-disable-line react-hooks/exhaustive-deps

  const getStyleSettings = useCallback((): StyleSettings => {
    const s = getSettings();
    const { text: _t, ...style } = s;
    return style;
  }, [getSettings]);

  const loadUserPresets = useCallback(async () => {
    try {
      const res = await fetch("/api/deco-preset");
      const data = await res.json() as { ok: boolean; presets?: UserPreset[] };
      if (data.ok && data.presets) setUserPresets(data.presets);
    } catch { /* ok */ }
  }, []);

  const handleSavePreset = async () => {
    const name = savePresetName.trim();
    if (!name) return;
    setSavingPreset(true);
    try {
      const res = await fetch("/api/deco-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, settings: getStyleSettings() }),
      });
      const data = await res.json() as { ok: boolean; preset?: UserPreset };
      if (data.ok && data.preset) {
        setUserPresets(p => [...p, data.preset!]);
        setSavePresetName("");
        setSaveInputOpen(false);
      }
    } catch { /* ok */ } finally { setSavingPreset(false); }
  };

  const handleDeleteUserPreset = async (id: string) => {
    try {
      const res = await fetch(`/api/deco-preset/${id}`, { method: "DELETE" });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        setUserPresets(p => p.filter(x => x.id !== id));
        if (selectedUserPresetId === id) setSelectedUserPresetId(null);
      }
    } catch { /* ok */ }
  };

  const handleRenameUserPreset = async (id: string, name: string) => {
    const trimmed = name.trim();
    setRenamingPresetId(null);
    if (!trimmed) return;
    try {
      const res = await fetch(`/api/deco-preset/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) setUserPresets(p => p.map(x => x.id === id ? { ...x, name: trimmed } : x));
    } catch { /* ok */ }
  };

  const handleDuplicateUserPreset = async (up: UserPreset) => {
    try {
      const res = await fetch("/api/deco-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${up.name} のコピー`, settings: up.settings }),
      });
      const data = await res.json() as { ok: boolean; preset?: UserPreset };
      if (data.ok && data.preset) setUserPresets(p => [...p, data.preset!]);
    } catch { /* ok */ }
  };

  const handleDrop = (toId: string) => {
    const fromId = draggingId;
    setDraggingId(null); setDragOverId(null);
    if (!fromId || fromId === toId) return;
    const from = userPresets.findIndex(p => p.id === fromId);
    const to   = userPresets.findIndex(p => p.id === toId);
    if (from === -1 || to === -1) return;
    const next = [...userPresets];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setUserPresets(next);
    fetch("/api/deco-preset/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map(p => p.id) }),
    }).catch(() => {});
  };

  // ユーザープリセット読み込み
  useEffect(() => {
    if (open) loadUserPresets();
  }, [open, loadUserPresets]);

  // Ctrl+Z でスタイルを元に戻す（テキスト入力中は除外）
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleUndo]);

  // エディタを閉じたら一時スクリーンショットを破棄
  useEffect(() => {
    if (!open) {
      bgImgRef.current = null;
      setFrameAsBg(false);
      setBgImgLoaded(false);
    }
  }, [open]);

  const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const handleTextureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const src = ev.target?.result as string;
      setTexture(p => ({ ...p, src, enabled: true }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const fetchWorkspaceFiles = async () => {
    setFilesLoading(true);
    try {
      const params = new URLSearchParams();
      if (workspaceId) params.set("workspaceId", workspaceId);
      const res  = await fetch(`/api/fileupload/list?${params}`);
      const data = await res.json() as { ok: boolean; files?: WorkspaceFile[] };
      if (data.ok && data.files) setWorkspaceFiles(data.files.filter(f => f.fileType === "image"));
    } catch { /* ok */ } finally { setFilesLoading(false); }
  };

  const generatePng = (): Promise<Blob> => new Promise((resolve, reject) => {
    const off = document.createElement("canvas");
    off.width = CANVAS_W; off.height = CANVAS_H;
    drawOnCanvas(off, { ...getSettings() }, "transparent", textureImgRef.current, null, true);
    off.toBlob(b => b ? resolve(b) : reject(new Error("PNG生成失敗")), "image/png");
  });

  const handleCanvasClick = () => {
    if (isEditingText) return;
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const cssH = canvas.getBoundingClientRect().height;
    const scale = cssH / CANVAS_H;
    const scaledFs = Math.max(10, Math.round(fontSize * scale));
    setOverlayFontSize(scaledFs);
    // テキスト幅を canvas で計測してセレクションボックスのサイズに使用
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `${bold ? "bold " : ""}${italic ? "italic " : ""}${fontSize}px "${fontFamily}"`;
      const lines = getTextLines(text);
      const maxW = Math.max(...lines.map(l => ctx.measureText(l || " ").width));
      setOverlayTextWidth(Math.max(60, Math.round(maxW * scale) + 24));
    }
    setIsEditingText(true);
    setTimeout(() => textEditRef.current?.focus(), 0);
  };

  // テキスト幅を計測してアンカー位置を計算するユーティリティ
  const measureTextWidthPct = useCallback((): number => {
    const canvas = mainCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return 0;
    ctx.font = `${italic ? "italic " : ""}${bold ? "bold " : ""}${fontSize}px "${fontFamily}", sans-serif`;
    const lines = getTextLines(text);
    return Math.max(...lines.map(l => ctx.measureText(l || " ").width)) / CANVAS_W * 100;
  }, [bold, italic, fontSize, fontFamily, text]);

  // 水平スナップ — alignを変えずにtextXPctだけ調整
  const snapLeft = useCallback(() => {
    const wPct = measureTextWidthPct();
    if (align === "left")        setTextXPct(safeMarginH);
    else if (align === "center") setTextXPct(+(safeMarginH + wPct / 2).toFixed(2));
    else                         setTextXPct(+(safeMarginH + wPct).toFixed(2));
  }, [align, measureTextWidthPct, safeMarginH]);

  const snapHCenter = useCallback(() => {
    if (align === "center") { setTextXPct(50); return; }
    const wPct = measureTextWidthPct();
    if (align === "left")  setTextXPct(+(50 - wPct / 2).toFixed(2));
    else                   setTextXPct(+(50 + wPct / 2).toFixed(2));
  }, [align, measureTextWidthPct]);

  const snapRight = useCallback(() => {
    const wPct = measureTextWidthPct();
    if (align === "right")       setTextXPct(100 - safeMarginH);
    else if (align === "center") setTextXPct(+(100 - safeMarginH - wPct / 2).toFixed(2));
    else                         setTextXPct(+(100 - safeMarginH - wPct).toFixed(2));
  }, [align, measureTextWidthPct, safeMarginH]);

  const handleInsert = async () => {
    setInserting(true); setError("");
    try {
      const blob = await generatePng();
      const fileName = `deco-telop-${Date.now()}.png`;
      const pres = await fetch("/api/fileupload/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, mimeType: "image/png", sizeBytes: blob.size, workspaceId }),
      }).then(r => r.json()) as { ok: boolean; presignedUrl?: string; fileUrl?: string; message?: string };
      if (!pres.ok || !pres.presignedUrl) throw new Error(pres.message ?? "アップロードURL取得失敗");
      const up = await fetch(pres.presignedUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
      if (!up.ok) throw new Error("アップロード失敗");
      const settings: DecoSettings = {
        text, fontFamily, fontSize, bold, italic, align,
        letterSpacing, lineHeight,
        textYPct, textXPct,
        fillKind, fillColor, fillOpacity, fillColor2, fillOpacity2, fillAngle,
        fillColor3, fillOpacity3, fillColor4, fillOpacity4,
        gloss, texture, outerStrokes, shadow, glow, bg,
      };
      saveGenMeta(pres.fileUrl!, { type: "deco-telop", settings: settings as unknown as Record<string, unknown> });
      onGenerated?.(pres.fileUrl!, settings);
      onInsert({ type: "image", src: pres.fileUrl! }, position);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "挿入に失敗しました");
    } finally { setInserting(false); }
  };

  const handleUpdate = async () => {
    if (!existingFileUrl) return;
    setInserting(true); setError("");
    try {
      const blob = await generatePng();
      const fileName = `deco-telop-${Date.now()}.png`;
      const pres = await fetch("/api/fileupload/presign", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName, mimeType: "image/png", sizeBytes: blob.size, workspaceId }),
      }).then(r => r.json()) as { ok: boolean; presignedUrl?: string; fileUrl?: string; message?: string };
      if (!pres.ok || !pres.presignedUrl) throw new Error(pres.message ?? "アップロードURL取得失敗");
      const up = await fetch(pres.presignedUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
      if (!up.ok) throw new Error("アップロード失敗");
      const settings: DecoSettings = {
        text, fontFamily, fontSize, bold, italic, align,
        letterSpacing, lineHeight,
        textYPct, textXPct,
        fillKind, fillColor, fillOpacity, fillColor2, fillOpacity2, fillAngle,
        fillColor3, fillOpacity3, fillColor4, fillOpacity4,
        gloss, texture, outerStrokes, shadow, glow, bg,
      };
      saveGenMeta(pres.fileUrl!, { type: "deco-telop", settings: settings as unknown as Record<string, unknown> });
      onGenerated?.(pres.fileUrl!, settings);
      onUpdate?.({ type: "image", src: pres.fileUrl! }, existingFileUrl);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    } finally { setInserting(false); }
  };

  if (!open) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.52)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}
      onClick={() => { if (!inserting) { setError(""); onClose(); } }}
    >
      <div
        style={{ background: "#ffffff", borderRadius: 16, width: "96vw", maxWidth: 1300, height: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", color: "#1e293b" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Title bar ── */}
        <div style={{ padding: "12px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14, backgroundImage: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>装飾テロップエディタ</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 20, lineHeight: 1, padding: 4 }}>✕</button>
        </div>

        {/* ── Preset strip ── */}
        <div style={{ borderBottom: "1px solid #e2e8f0", flexShrink: 0, background: "#f8fafc", display: "flex" }}>
          {/* スタイルプリセット（左・スクロール可） */}
          <div style={{ flex: 1, minWidth: 0, borderRight: "1px solid #e2e8f0" }}>
            <div style={{ padding: "6px 14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }}>スタイルプリセット</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {undoSnapshot && (
                  <button
                    onClick={handleUndo}
                    title="スタイルを元に戻す (Ctrl+Z)"
                    style={{ fontSize: 10, padding: "3px 9px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap", fontFamily: FONT, display: "flex", alignItems: "center", gap: 4 }}
                  >
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7H9a4 4 0 0 1 0 8H5"/>
                      <polyline points="3,4 3,8 7,8"/>
                    </svg>
                    元に戻す
                  </button>
                )}
                {saveInputOpen ? (
                  <>
                    <input
                      autoFocus
                      value={savePresetName}
                      onChange={e => setSavePresetName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === "Enter") handleSavePreset();
                        if (e.key === "Escape") { setSaveInputOpen(false); setSavePresetName(""); }
                      }}
                      placeholder="プリセット名"
                      style={{ fontSize: 11, padding: "3px 8px", border: "1.5px solid #5184F0", borderRadius: 6, outline: "none", background: "#fff", color: "#334155", width: 140, fontFamily: FONT }}
                    />
                    <button onClick={handleSavePreset} disabled={savingPreset || !savePresetName.trim()} style={{ fontSize: 10, padding: "3px 10px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontFamily: FONT, opacity: !savePresetName.trim() ? 0.5 : 1 }}>
                      {savingPreset ? "…" : "保存"}
                    </button>
                    <button onClick={() => { setSaveInputOpen(false); setSavePresetName(""); }} style={{ fontSize: 10, padding: "3px 8px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontFamily: FONT }}>✕</button>
                  </>
                ) : (
                  <button onClick={() => setSaveInputOpen(true)} style={{ fontSize: 10, padding: "3px 10px", background: "#f1f5f9", color: "#64748b", border: "1.5px solid #e2e8f0", borderRadius: 6, cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap", fontFamily: FONT }}>
                    ＋ スタイルを保存
                  </button>
                )}
              </div>
            </div>
            <div
              style={{ display: "flex", gap: 6, padding: "6px 14px 10px", overflowX: "auto" }}
              onDragLeave={() => setDragOverId(null)}
            >
              {userPresets.length === 0 && (
                <div style={{ fontSize: 11, color: "#cbd5e1", padding: "10px 0", alignSelf: "center" }}>保存したスタイルがここに表示されます</div>
              )}
              {userPresets.map(up => (
                <UserPresetThumb
                  key={up.id}
                  preset={up}
                  selected={selectedUserPresetId === up.id}
                  isRenaming={renamingPresetId === up.id}
                  renameValue={renameValue}
                  isDragOver={dragOverId === up.id}
                  onSelect={() => setSelectedUserPresetId(up.id)}
                  onApply={() => applyUserPreset(up)}
                  onDelete={() => handleDeleteUserPreset(up.id)}
                  onDuplicate={() => handleDuplicateUserPreset(up)}
                  onRenameStart={() => { setRenamingPresetId(up.id); setRenameValue(up.name); }}
                  onRenameValueChange={setRenameValue}
                  onRenameCommit={() => handleRenameUserPreset(up.id, renameValue)}
                  onRenameCancel={() => setRenamingPresetId(null)}
                  onDragStart={() => setDraggingId(up.id)}
                  onDragOver={() => setDragOverId(up.id)}
                  onDrop={() => handleDrop(up.id)}
                />
              ))}
            </div>
          </div>

          {/* 表示パネル（右・固定幅） */}
          <div style={{ flexShrink: 0, padding: "6px 14px 10px", display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, letterSpacing: "0.05em" }}>表示</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 2 }}>
                <ToolBtn active={showSafeArea} onClick={() => setShowSafeArea(v => !v)} title="セーフエリア表示切替">セーフ</ToolBtn>
                <button
                  onClick={() => setSafeSettingsOpen(v => !v)}
                  title="セーフエリア設定"
                  style={{
                    background: safeSettingsOpen ? "#dbeafe" : "#f1f5f9",
                    border: "1.5px solid #e2e8f0", borderRadius: 6,
                    color: "#64748b", cursor: "pointer",
                    fontSize: 12, padding: "4px 6px", lineHeight: 1, fontWeight: 700,
                    transition: "background .15s",
                  }}
                >⚙</button>
                {safeSettingsOpen && (
                  <div
                    style={{
                      position: "absolute", top: "calc(100% + 6px)", right: 0,
                      background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10,
                      boxShadow: "0 4px 20px rgba(0,0,0,0.14)", padding: "14px 16px",
                      zIndex: 500, minWidth: 230, fontFamily: FONT,
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>セーフエリア設定</span>
                      <button onClick={() => setSafeSettingsOpen(false)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>上下マージン</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="range" min={0} max={30} value={safeMarginV} onChange={e => setSafeMarginV(+e.target.value)}
                          style={{ flex: 1, accentColor: "#5184F0", height: 4 }} />
                        <input type="number" min={0} max={30} value={safeMarginV} onChange={e => setSafeMarginV(Math.max(0, Math.min(30, +e.target.value)))}
                          style={{ width: 44, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 5, color: "#334155", fontSize: 11, padding: "2px 4px", textAlign: "center", outline: "none" }} />
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>%</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, marginBottom: 6 }}>左右マージン</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="range" min={0} max={30} value={safeMarginH} onChange={e => setSafeMarginH(+e.target.value)}
                          style={{ flex: 1, accentColor: "#5184F0", height: 4 }} />
                        <input type="number" min={0} max={30} value={safeMarginH} onChange={e => setSafeMarginH(Math.max(0, Math.min(30, +e.target.value)))}
                          style={{ width: 44, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 5, color: "#334155", fontSize: 11, padding: "2px 4px", textAlign: "center", outline: "none" }} />
                        <span style={{ fontSize: 10, color: "#94a3b8" }}>%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <ToolBtn active={!frameAsBg && previewBg === "transparent"} onClick={() => { setFrameAsBg(false); setPreviewBg("transparent"); }}>透明</ToolBtn>
              <ToolBtn
                active={frameAsBg}
                onClick={async () => {
                  if (!onCaptureFrame || capturingFrame) return;
                  setCapturingFrame(true);
                  try {
                    const url = await onCaptureFrame();
                    if (url) loadBgFromUrl(url);
                  } catch { /* ok */ } finally { setCapturingFrame(false); }
                }}
                title="現在のフレームを背景に表示"
              >
                <span style={{ opacity: onCaptureFrame ? 1 : 0.4 }}>{capturingFrame ? "取得中…" : "現在の画面"}</span>
              </ToolBtn>
            </div>
          </div>
        </div>

        {/* ── Text toolbar ── */}
        <div style={{ borderBottom: "1px solid #e2e8f0", padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" }}>
          <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} style={toolSelectStyle}>
            {FONT_GROUPS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </optgroup>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <input type="number" min={12} max={400} value={fontSize} onChange={e => setFontSize(+e.target.value)} style={{ ...toolSelectStyle, width: 62 }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>px</span>
          </div>
          <ToolBtn active={bold}   onClick={() => setBold(v => !v)}   title="太字">B</ToolBtn>
          <ToolBtn active={italic} onClick={() => setItalic(v => !v)} title="斜体" style={{ fontStyle: "italic" }}>I</ToolBtn>
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>文字間</span>
          <input type="number" min={-20} max={200} step={1} value={letterSpacing} onChange={e => setLetterSpacing(+e.target.value)}
            style={{ ...toolSelectStyle, width: 52 }} />
          <span style={{ fontSize: 11, color: "#94a3b8" }}>px</span>
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>行間</span>
          <input type="number" min={0.8} max={4.0} step={0.05} value={lineHeight} onChange={e => setLineHeight(+e.target.value)}
            style={{ ...toolSelectStyle, width: 52 }} />
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          {/* テキスト段落揃え */}
          <ToolBtn active={align === "left"}   onClick={() => setAlign("left")}   title="テキスト左揃え" style={{ padding: "5px 6px", lineHeight: 0 }}><TextAlignLeftIcon /></ToolBtn>
          <ToolBtn active={align === "center"} onClick={() => setAlign("center")} title="テキスト中央"   style={{ padding: "5px 6px", lineHeight: 0 }}><TextAlignCenterIcon /></ToolBtn>
          <ToolBtn active={align === "right"}  onClick={() => setAlign("right")}  title="テキスト右揃え" style={{ padding: "5px 6px", lineHeight: 0 }}><TextAlignRightIcon /></ToolBtn>
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          {/* オブジェクト水平位置 — alignは変えず、textXPctだけ調整してエッジがセーフマージンに合う */}
          <ToolBtn active={textXPct <= safeMarginH + 2}        onClick={snapLeft}    title="左端をセーフマージンに合わせる" style={{ padding: "5px 6px", lineHeight: 0 }}><AlignTextLeftIcon /></ToolBtn>
          <ToolBtn active={textXPct >= 48 && textXPct <= 52}   onClick={snapHCenter} title="水平中央"                       style={{ padding: "5px 6px", lineHeight: 0 }}><AlignTextCenterIcon /></ToolBtn>
          <ToolBtn active={textXPct >= 100 - safeMarginH - 2}  onClick={snapRight}   title="右端をセーフマージンに合わせる" style={{ padding: "5px 6px", lineHeight: 0 }}><AlignTextRightIcon /></ToolBtn>
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          {/* オブジェクト垂直位置 — 複数行の高さを考慮 */}
          {(() => {
            const nLines  = text.split("\n").length;
            const halfH   = getLineH(fontSize, lineHeight) * nLines / 2 / CANVAS_H * 100;
            return (<>
              <ToolBtn active={textYPct <= safeMarginV + halfH + 1}        onClick={() => setTextYPct(+(safeMarginV + halfH).toFixed(1))}        title="上端をセーフマージンに合わせる" style={{ padding: "5px 6px", lineHeight: 0 }}><AlignTopIcon /></ToolBtn>
              <ToolBtn active={textYPct >= 45 && textYPct <= 55}            onClick={() => setTextYPct(50)}                                        title="垂直中央"                       style={{ padding: "5px 6px", lineHeight: 0 }}><AlignVCenterIcon /></ToolBtn>
              <ToolBtn active={textYPct >= 100 - safeMarginV - halfH - 1}  onClick={() => setTextYPct(+(100 - safeMarginV - halfH).toFixed(1))}  title="下端をセーフマージンに合わせる" style={{ padding: "5px 6px", lineHeight: 0 }}><AlignBottomIcon /></ToolBtn>
            </>);
          })()}
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>位置X</span>
          <input type="range" min={0} max={100} value={textXPct} onChange={e => setTextXPct(+e.target.value)}
            style={{ width: 60, accentColor: "#5184F0", height: 4 }} />
          <input type="number" min={0} max={100} value={textXPct} onChange={e => setTextXPct(Math.max(0, Math.min(100, +e.target.value)))}
            style={{ width: 38, ...toolSelectStyle, padding: "4px 4px", textAlign: "center", fontSize: 11 }} />
          <span style={{ fontSize: 10, color: "#94a3b8" }}>%</span>
          <div style={{ width: 1, height: 22, background: "#e2e8f0", margin: "0 2px" }} />
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>位置Y</span>
          <input type="range" min={0} max={100} value={textYPct} onChange={e => setTextYPct(+e.target.value)}
            style={{ width: 60, accentColor: "#5184F0", height: 4 }} />
          <input type="number" min={0} max={100} value={textYPct} onChange={e => setTextYPct(Math.max(0, Math.min(100, +e.target.value)))}
            style={{ width: 38, ...toolSelectStyle, padding: "4px 4px", textAlign: "center", fontSize: 11 }} />
          <span style={{ fontSize: 10, color: "#94a3b8" }}>%</span>
        </div>

        {/* ── Main area ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Canvas */}
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#eef0f4", padding: 24, overflow: "hidden" }}>
            <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", display: "inline-flex" }}>
              <canvas
                ref={mainCanvasRef} width={CANVAS_W} height={CANVAS_H}
                style={{ maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", borderRadius: 8, display: "block", boxShadow: "0 2px 12px rgba(0,0,0,0.10)", cursor: "text" }}
                onClick={handleCanvasClick}
                title="クリックしてテキストを編集"
              />
              {/* テキスト直接編集オーバーレイ */}
              {isEditingText && (() => {
                return (
                  <div style={{
                    position: "absolute",
                    top: `${textYPct}%`,
                    left: `${textXPct}%`,
                    transform: align === "center" ? "translate(-50%, -50%)"
                             : align === "right"  ? "translate(-100%, -50%)"
                             :                      "translateY(-50%)",
                    pointerEvents: "none",
                  }}>
                    <div style={{ position: "relative", display: "inline-block" }}>
                      {/* セレクションボックス */}
                      <div style={{
                        position: "absolute", inset: -6,
                        border: "1.5px solid rgba(255,255,255,0.8)",
                        pointerEvents: "none",
                      }}>
                        {/* 8ハンドル */}
                        {([
                          { top: -4,            left: -4 },
                          { top: -4,            left: "calc(50% - 4px)" },
                          { top: -4,            right: -4 },
                          { top: "calc(50% - 4px)", left: -4 },
                          { top: "calc(50% - 4px)", right: -4 },
                          { bottom: -4,         left: -4 },
                          { bottom: -4,         left: "calc(50% - 4px)" },
                          { bottom: -4,         right: -4 },
                        ] as React.CSSProperties[]).map((pos, i) => (
                          <div key={i} style={{
                            position: "absolute", width: 8, height: 8,
                            background: "#fff", border: "1px solid rgba(80,80,80,0.6)",
                            ...pos,
                          }} />
                        ))}
                      </div>
                      {/* テキストキャプチャ用の透明 input（カーソルのみ表示） */}
                      <textarea
                        ref={textEditRef}
                        value={text}
                        rows={Math.max(1, text.split("\n").length)}
                        onChange={e => {
                          const val = e.target.value;
                          setText(val);
                          setSelectedPreset(null);
                          const canvas = mainCanvasRef.current;
                          if (canvas) {
                            const ctx = canvas.getContext("2d");
                            if (ctx) {
                              ctx.font = `${bold ? "bold " : ""}${italic ? "italic " : ""}${fontSize}px "${fontFamily}"`;
                              const lines = getTextLines(val);
                              const maxW = Math.max(...lines.map(l => ctx.measureText(l || " ").width));
                              const scale = canvas.getBoundingClientRect().height / CANVAS_H;
                              setOverlayTextWidth(Math.max(60, Math.round(maxW * scale) + 24));
                            }
                          }
                        }}
                        onBlur={() => setIsEditingText(false)}
                        onKeyDown={e => { if (e.key === "Escape") { e.preventDefault(); setIsEditingText(false); } }}
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "transparent",
                          caretColor: "#fff",
                          fontSize: overlayFontSize,
                          fontFamily,
                          fontWeight: bold ? 700 : 400,
                          fontStyle: italic ? "italic" : "normal",
                          textAlign: align,
                          padding: "4px 6px",
                          width: overlayTextWidth,
                          pointerEvents: "all",
                          boxSizing: "border-box",
                          display: "block",
                          resize: "none",
                          overflow: "hidden",
                          lineHeight: 1.25,
                        }}
                      />
                    </div>
                  </div>
                );
              })()}
              {/* タイトルセーフエリア */}
              {showSafeArea && (
                <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                  <div style={{
                    position: "absolute",
                    top: `${safeMarginV}%`, left: `${safeMarginH}%`,
                    right: `${safeMarginH}%`, bottom: `${safeMarginV}%`,
                    border: "1px dashed rgba(0,210,255,0.85)",
                    boxSizing: "border-box",
                  }}>
                    <span style={{ position: "absolute", top: 2, left: 4, fontSize: 9, color: "rgba(0,210,255,1)", fontWeight: 700, lineHeight: 1, background: "rgba(0,0,0,0.35)", padding: "1px 4px", borderRadius: 2 }}>
                      TITLE SAFE {safeMarginH}% / {safeMarginV}%
                    </span>
                  </div>
                </div>
              )}
              {/* ホバーヒント */}
              {!isEditingText && (
                <div style={{
                  position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                  background: "rgba(0,0,0,0.45)", color: "#fff",
                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  pointerEvents: "none", whiteSpace: "nowrap", opacity: 0.7,
                }}>
                  クリックしてテキストを編集
                </div>
              )}
            </div>
          </div>

          {/* Properties panel */}
          <div style={{ width: 288, borderLeft: "1px solid #e2e8f0", overflowY: "auto", overflowX: "hidden", flexShrink: 0, background: "#f8fafc" }}>
            <PropTitle>プロパティ</PropTitle>

            {/* ── 塗り（光沢・テクスチャを内包） ── */}
            <PropSection title="塗り">
              {/* 塗りの種類 */}
              <PropRow label="種類">
                <KindSelect
                  options={[["solid", "ベタ"], ["linear", "線型"], ["radial", "円型"], ["4color", "4色"]]}
                  value={fillKind}
                  onChange={v => { setFillKind(v as FillKind); setSelectedPreset(null); }}
                />
              </PropRow>
              <PropRow label={fillKind !== "solid" ? "カラー1" + (fillKind === "4color" ? " (TL)" : "") : "カラー"}>
                <ColorInput color={fillColor} onChange={c => { setFillColor(c); setSelectedPreset(null); }} />
              </PropRow>
              <PropRow label="不透明度">
                <SliderWithNum value={fillOpacity} min={0} max={100} unit="%" onChange={v => { setFillOpacity(v); setSelectedPreset(null); }} />
              </PropRow>

              {/* カラー2 (for linear, radial, 4color) */}
              {fillKind !== "solid" && (
                <PropRow label={"カラー2" + (fillKind === "4color" ? " (TR)" : "")}>
                  <ColorInput color={fillColor2} onChange={c => { setFillColor2(c); setSelectedPreset(null); }} />
                </PropRow>
              )}
              {fillKind !== "solid" && (
                <PropRow label="不透明度2">
                  <SliderWithNum value={fillOpacity2} min={0} max={100} unit="%" onChange={v => { setFillOpacity2(v); setSelectedPreset(null); }} />
                </PropRow>
              )}

              {/* グラデーション角度 (linear only) */}
              {fillKind === "linear" && (
                <PropRow label="角度">
                  <SliderWithNum value={fillAngle} min={0} max={360} unit="°" onChange={v => { setFillAngle(v); setSelectedPreset(null); }} />
                </PropRow>
              )}

              {/* カラー3, カラー4 (4color only) */}
              {fillKind === "4color" && (<>
                <PropRow label="カラー3 (BR)">
                  <ColorInput color={fillColor3} onChange={c => { setFillColor3(c); setSelectedPreset(null); }} />
                </PropRow>
                <PropRow label="不透明度3">
                  <SliderWithNum value={fillOpacity3} min={0} max={100} unit="%" onChange={v => { setFillOpacity3(v); setSelectedPreset(null); }} />
                </PropRow>
                <PropRow label="カラー4 (BL)">
                  <ColorInput color={fillColor4} onChange={c => { setFillColor4(c); setSelectedPreset(null); }} />
                </PropRow>
                <PropRow label="不透明度4">
                  <SliderWithNum value={fillOpacity4} min={0} max={100} unit="%" onChange={v => { setFillOpacity4(v); setSelectedPreset(null); }} />
                </PropRow>
              </>)}

              {/* 光沢 */}
              <InnerSection title="光沢" enabled={gloss.enabled} onToggle={v => setGloss(p => ({ ...p, enabled: v }))}>
                <PropRow label="強さ">
                  <SliderWithNum value={gloss.intensity} min={5} max={100} unit="%" onChange={v => setGloss(p => ({ ...p, intensity: v }))} />
                </PropRow>
                <PropRow label="範囲">
                  <SliderWithNum value={gloss.size} min={10} max={100} unit="%" onChange={v => setGloss(p => ({ ...p, size: v }))} />
                </PropRow>
                <PropRow label="角度">
                  <SliderWithNum value={gloss.angle ?? 90} min={0} max={360} unit="°" onChange={v => setGloss(p => ({ ...p, angle: v }))} />
                </PropRow>
              </InnerSection>

              {/* テクスチャ */}
              <InnerSection title="テクスチャ" enabled={texture.enabled} onToggle={v => setTexture(p => ({ ...p, enabled: v }))}>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button onClick={() => fileInputRef.current?.click()} style={srcBtnStyle}>↑ アップロード</button>
                  <button onClick={() => { fetchWorkspaceFiles(); setFilePickerOpen(true); }} style={srcBtnStyle}>📁 ファイルから参照</button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleTextureUpload} />
                </div>
                {texture.src ? (
                  <div style={{ marginBottom: 8 }}>
                    <img src={texture.src} alt="texture" style={{ width: "100%", height: 52, objectFit: "cover", borderRadius: 7, border: "1.5px solid #e2e8f0", display: "block" }} />
                    <button onClick={() => setTexture(p => ({ ...p, src: "" }))} style={{ fontSize: 10, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: "3px 0" }}>
                      ✕ 削除
                    </button>
                  </div>
                ) : (
                  <div style={{ height: 38, border: "1.5px dashed #e2e8f0", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#cbd5e1", marginBottom: 8 }}>
                    画像を選択してください
                  </div>
                )}
                <PropRow label="不透明度">
                  <SliderWithNum value={texture.opacity} min={0} max={100} unit="%" onChange={v => setTexture(p => ({ ...p, opacity: v }))} />
                </PropRow>
                <PropRow label="スケール">
                  <SliderWithNum value={texture.scale} min={10} max={500} unit="%" onChange={v => setTexture(p => ({ ...p, scale: v }))} />
                </PropRow>
              </InnerSection>
            </PropSection>

            {/* ストローク */}
            <PropSection title="ストローク" action={
              outerStrokes.length < 5
                ? <button onClick={() => setOuterStrokes(p => [...p, defStroke(newId(), "#ffffff", 4)])} style={addBtnStyle}>＋追加</button>
                : <span style={{ fontSize: 10, color: "#94a3b8" }}>最大5つ</span>
            }>
              {outerStrokes.length > 1 && (
                <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>上 = 内側（テキストに近い）/ 下 = 外側</div>
              )}
              {outerStrokes.length === 0 && <div style={{ fontSize: 11, color: "#cbd5e1", padding: "4px 0" }}>なし</div>}
              {outerStrokes.map((st, i) => (
                <StrokeRow key={st.id} stroke={st}
                  onChange={s => setOuterStrokes(p => p.map((x, j) => j === i ? { ...x, ...s } : x))}
                  onRemove={() => setOuterStrokes(p => p.filter((_, j) => j !== i))}
                  onMoveUp={i > 0 ? () => setOuterStrokes(p => { const n = [...p]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n; }) : undefined}
                  onMoveDown={i < outerStrokes.length - 1 ? () => setOuterStrokes(p => { const n = [...p]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n; }) : undefined}
                />
              ))}
            </PropSection>

            {/* 影 */}
            <PropSection title="影" toggle={{ value: shadow.enabled, onChange: v => setShadow(p => ({ ...p, enabled: v })) }}>
              {shadow.enabled && <>
                <PropRow label="カラー"><ColorInput color={shadow.color} onChange={c => setShadow(p => ({ ...p, color: c }))} /></PropRow>
                <PropRow label="不透明度"><SliderWithNum value={shadow.opacity} min={0} max={100} unit="%" onChange={v => setShadow(p => ({ ...p, opacity: v }))} /></PropRow>
                <PropRow label="ぼかし"><SliderWithNum value={shadow.blur} min={0} max={80} onChange={v => setShadow(p => ({ ...p, blur: v }))} /></PropRow>
                <PropRow label="X"><SliderWithNum value={shadow.x} min={-40} max={40} onChange={v => setShadow(p => ({ ...p, x: v }))} /></PropRow>
                <PropRow label="Y"><SliderWithNum value={shadow.y} min={-40} max={40} onChange={v => setShadow(p => ({ ...p, y: v }))} /></PropRow>
              </>}
            </PropSection>

            {/* 光彩 */}
            <PropSection title="光彩" toggle={{ value: glow.enabled, onChange: v => setGlow(p => ({ ...p, enabled: v })) }}>
              {glow.enabled && <>
                <PropRow label="カラー"><ColorInput color={glow.color} onChange={c => setGlow(p => ({ ...p, color: c }))} /></PropRow>
                <PropRow label="不透明度"><SliderWithNum value={glow.opacity} min={0} max={100} unit="%" onChange={v => setGlow(p => ({ ...p, opacity: v }))} /></PropRow>
                <PropRow label="ぼかし"><SliderWithNum value={glow.blur} min={0} max={80} onChange={v => setGlow(p => ({ ...p, blur: v }))} /></PropRow>
                <PropRow label="強度"><SliderWithNum value={glow.strength} min={1} max={10} onChange={v => setGlow(p => ({ ...p, strength: v }))} /></PropRow>
              </>}
            </PropSection>

            {/* 背景 */}
            <PropSection title="背景" toggle={{ value: bg.enabled, onChange: v => setBg(p => ({ ...p, enabled: v })) }}>
              {bg.enabled && <>
                <PropRow label="カラー"><ColorInput color={bg.color} onChange={c => setBg(p => ({ ...p, color: c }))} /></PropRow>
                <PropRow label="不透明度"><SliderWithNum value={bg.opacity} min={0} max={100} unit="%" onChange={v => setBg(p => ({ ...p, opacity: v }))} /></PropRow>
                <PropRow label="余白X"><SliderWithNum value={bg.paddingX} min={0} max={120} onChange={v => setBg(p => ({ ...p, paddingX: v }))} /></PropRow>
                <PropRow label="余白Y"><SliderWithNum value={bg.paddingY} min={0} max={80} onChange={v => setBg(p => ({ ...p, paddingY: v }))} /></PropRow>
                <PropRow label="角丸"><SliderWithNum value={bg.radius} min={0} max={80} onChange={v => setBg(p => ({ ...p, radius: v }))} /></PropRow>
              </>}
            </PropSection>
          </div>
        </div>

        {/* ── Action bar ── */}
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "12px 18px", display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          {error && <span style={{ flex: 1, fontSize: 12, color: "#ef4444" }}>{error}</span>}
          {!error && <span style={{ flex: 1 }} />}
          {existingFileUrl ? (
            <>
              <button onClick={handleInsert} disabled={inserting} style={{ ...secondaryBtnStyle, opacity: inserting ? 0.6 : 1, cursor: inserting ? "not-allowed" : "pointer" }}>
                {inserting ? "処理中…" : "新規テロップとして挿入"}
              </button>
              <button onClick={handleUpdate} disabled={inserting} style={{ ...primaryBtnStyle, opacity: inserting ? 0.6 : 1, cursor: inserting ? "not-allowed" : "pointer" }}>
                {inserting ? "処理中…" : "テロップを更新"}
              </button>
            </>
          ) : (
            <button onClick={handleInsert} disabled={inserting} style={{ ...primaryBtnStyle, opacity: inserting ? 0.6 : 1, cursor: inserting ? "not-allowed" : "pointer" }}>
              {inserting ? "挿入中…" : "タイムラインに挿入"}
            </button>
          )}
        </div>
      </div>

      {/* ── ファイル参照ピッカー ── */}
      {filePickerOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 3200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT }}
          onClick={() => setFilePickerOpen(false)}
        >
          <div
            style={{ background: "#ffffff", borderRadius: 14, width: 560, maxHeight: 480, display: "flex", flexDirection: "column", boxShadow: "0 12px 40px rgba(0,0,0,0.22)", overflow: "hidden" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#1e293b" }}>ファイルから参照</span>
              <button onClick={() => setFilePickerOpen(false)} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
              {filesLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#94a3b8" }}>読み込み中…</div>
              ) : workspaceFiles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", fontSize: 13, color: "#94a3b8" }}>画像ファイルがありません</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {workspaceFiles.map(f => (
                    <div key={f.id}
                      onClick={() => { setTexture(p => ({ ...p, src: f.fileUrl, enabled: true })); setFilePickerOpen(false); }}
                      style={{ cursor: "pointer", borderRadius: 8, overflow: "hidden", border: "1.5px solid #e2e8f0", transition: "border-color .15s" }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = "#5184F0")}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e2e8f0")}
                    >
                      <img src={f.fileUrl} alt={f.fileName} style={{ width: "100%", height: 72, objectFit: "cover", display: "block" }} />
                      <div style={{ fontSize: 9, color: "#94a3b8", padding: "3px 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Preset thumbnail ─────────────────────────────────────────────────────────

function PresetThumb({ preset, selected, onClick }: { preset: Preset; selected: boolean; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    drawOnCanvas(c, { ...preset, text: PREVIEW_TEXT, fontSize: 28 }, preset.previewBg);
  }, [preset]);
  return (
    <div onClick={onClick} style={{ flexShrink: 0, cursor: "pointer" }}>
      <canvas ref={ref} width={160} height={60}
        style={{ width: 100, height: 38, borderRadius: 6, display: "block", background: preset.previewBg,
          border: selected ? "2px solid #5184F0" : "2px solid #e2e8f0",
          boxShadow: selected ? "0 0 0 3px rgba(81,132,240,0.18)" : "none",
          transition: "border-color .15s, box-shadow .15s",
        }}
      />
      <div style={{ fontSize: 9, color: "#94a3b8", textAlign: "center", marginTop: 3, fontWeight: selected ? 700 : 400 }}>{preset.label}</div>
    </div>
  );
}

// ─── User Preset thumbnail ────────────────────────────────────────────────────

function UserPresetThumb({
  preset, selected, isRenaming, renameValue, isDragOver,
  onSelect, onApply, onDelete, onDuplicate,
  onRenameStart, onRenameValueChange, onRenameCommit, onRenameCancel,
  onDragStart, onDragOver, onDrop,
}: {
  preset: UserPreset; selected: boolean; isRenaming: boolean; renameValue: string; isDragOver: boolean;
  onSelect: () => void; onApply: () => void; onDelete: () => void; onDuplicate: () => void;
  onRenameStart: () => void; onRenameValueChange: (v: string) => void;
  onRenameCommit: () => void; onRenameCancel: () => void;
  onDragStart: () => void; onDragOver: () => void; onDrop: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const s = preset.settings as DecoSettings;
    drawOnCanvas(c, { ...s, text: PREVIEW_TEXT, fontSize: 28 }, "#000");
  }, [preset.settings]);

  const cardBorder = selected
    ? "2px solid #5184F0"
    : isDragOver
    ? "2px dashed #3b82f6"
    : hovered
    ? "2px solid #94a3b8"
    : "2px solid #e2e8f0";

  const cardShadow = selected
    ? "0 0 0 3px rgba(81,132,240,0.18), 0 4px 14px rgba(0,0,0,0.12)"
    : hovered
    ? "0 4px 14px rgba(0,0,0,0.12)"
    : "0 1px 4px rgba(0,0,0,0.06)";

  return (
    <div
      style={{ flexShrink: 0, width: 112, opacity: isDragOver ? 0.45 : 1, transition: "opacity .15s" }}
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; onDragOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* カードプレビュー */}
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: cardBorder, boxShadow: cardShadow, transition: "border .15s, box-shadow .15s", transform: hovered ? "translateY(-1px)" : "none" }}>
        <canvas
          ref={ref} width={160} height={60}
          onClick={onSelect}
          onDoubleClick={onApply}
          style={{ width: 112, height: 42, display: "block", background: "#0f172a", cursor: "pointer" }}
        />
        {/* ホバー時アクションボタン */}
        {hovered && !isRenaming && (
          <div style={{ position: "absolute", top: 5, right: 5, display: "flex", gap: 3 }}>
            <button
              onClick={e => { e.stopPropagation(); onDuplicate(); }}
              title="複製"
              style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(15,23,42,0.62)", border: "none", color: "#cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, backdropFilter: "blur(4px)" }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="5" width="9" height="9" rx="2"/>
                <path d="M11 5V3a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
              </svg>
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              title="削除"
              style={{ width: 22, height: 22, borderRadius: 6, background: "rgba(15,23,42,0.62)", border: "none", color: "#cbd5e1", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, backdropFilter: "blur(4px)" }}
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4,6 4,14 12,14 12,6"/>
                <line x1="2" y1="5" x2="14" y2="5"/>
                <path d="M6 5V3h4v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* 名前 */}
      {isRenaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={e => onRenameValueChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={e => {
            if (e.key === "Enter") onRenameCommit();
            if (e.key === "Escape") onRenameCancel();
          }}
          onClick={e => e.stopPropagation()}
          style={{ width: "100%", fontSize: 10, textAlign: "center", border: "1.5px solid #5184F0", borderRadius: 5, padding: "2px 4px", marginTop: 4, display: "block", outline: "none", fontFamily: FONT, boxSizing: "border-box", color: "#334155" }}
        />
      ) : (
        <div
          onDoubleClick={e => { e.stopPropagation(); onRenameStart(); }}
          title={`${preset.name}（ダブルクリックで名前変更）`}
          style={{ fontSize: 10, color: selected ? "#5184F0" : "#64748b", textAlign: "center", marginTop: 5, fontWeight: selected ? 700 : 500, width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer", letterSpacing: "0.01em" }}
        >
          {preset.name}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PropTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: "10px 14px 8px", fontSize: 10, fontWeight: 700, color: "#94a3b8", borderBottom: "1px solid #e2e8f0", letterSpacing: "0.08em", textTransform: "uppercase" }}>
      {children}
    </div>
  );
}

function PropSection({ title, children, action, toggle }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
  toggle?: { value: boolean; onChange: (v: boolean) => void };
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ borderBottom: "1px solid #e2e8f0" }}>
      <div onClick={() => setOpen(v => !v)} style={{ display: "flex", alignItems: "center", padding: "8px 14px", cursor: "pointer", gap: 6, background: open ? "#ffffff" : "#f8fafc", transition: "background .15s" }}>
        <span style={{ fontSize: 9, color: "#94a3b8", display: "inline-block", transition: "transform .15s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        {toggle && (
          <input type="checkbox" checked={toggle.value} onClick={e => e.stopPropagation()} onChange={e => toggle.onChange(e.target.checked)} style={{ accentColor: "#5184F0", cursor: "pointer" }} />
        )}
        <span style={{ fontSize: 12, fontWeight: 600, color: "#334155", flex: 1 }}>{title}</span>
        {action && <span onClick={e => e.stopPropagation()}>{action}</span>}
      </div>
      {open && <div style={{ padding: "6px 14px 12px", background: "#ffffff", overflow: "hidden" }}>{children}</div>}
    </div>
  );
}

/** 塗りセクション内のサブ折りたたみ（光沢・テクスチャ用） */
function InnerSection({ title, enabled, onToggle, children }: {
  title: string; enabled: boolean; onToggle: (v: boolean) => void; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginTop: 8, borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", marginBottom: enabled && open ? 8 : 0 }}
        onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: 9, color: "#94a3b8", display: "inline-block", transition: "transform .15s", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
        <input type="checkbox" checked={enabled}
          onClick={e => e.stopPropagation()} onChange={e => onToggle(e.target.checked)}
          style={{ accentColor: "#5184F0", cursor: "pointer" }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#475569" }}>{title}</span>
      </div>
      {enabled && open && <div style={{ paddingLeft: 10 }}>{children}</div>}
    </div>
  );
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 11, color: "#94a3b8", width: 60, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function ColorInput({ color, onChange }: { color: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
      <input type="color" value={color} onChange={e => onChange(e.target.value)}
        style={{ width: 28, height: 26, flexShrink: 0, border: "1.5px solid #e2e8f0", borderRadius: 5, cursor: "pointer", background: "none", padding: 0 }} />
      <input value={color} onChange={e => onChange(e.target.value)} maxLength={9}
        style={{ flex: 1, minWidth: 0, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 5, color: "#334155", fontSize: 11, padding: "3px 7px", fontFamily: "monospace", outline: "none" }} />
    </div>
  );
}

function SliderWithNum({ value, min, max, unit = "", onChange }: { value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(+e.target.value)}
        style={{ flex: 1, minWidth: 0, accentColor: "#5184F0", height: 4 }} />
      <input type="number" min={min} max={max} value={value} onChange={e => onChange(Math.max(min, Math.min(max, +e.target.value)))}
        style={{ width: 44, flexShrink: 0, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 5, color: "#334155", fontSize: 11, padding: "2px 4px", textAlign: "center", outline: "none" }} />
      {unit && <span style={{ fontSize: 10, color: "#94a3b8", flexShrink: 0 }}>{unit}</span>}
    </div>
  );
}

function KindSelect({ options, value, onChange }: {
  options: [string, string][]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)} style={{
          border: value === val ? "none" : "1.5px solid #e2e8f0",
          borderRadius: 5, padding: "3px 8px", fontSize: 10, fontWeight: 600,
          fontFamily: FONT, cursor: "pointer",
          background: value === val ? "#3b82f6" : "#f8fafc",
          color: value === val ? "#fff" : "#64748b",
          transition: "all 0.15s",
        }}>{label}</button>
      ))}
    </div>
  );
}

function StrokeRow({ stroke, onChange, onRemove, onMoveUp, onMoveDown }: {
  stroke: StrokeItem; onChange: (s: Partial<StrokeItem>) => void; onRemove: () => void;
  onMoveUp?: () => void; onMoveDown?: () => void;
}) {
  const kind     = stroke.kind     ?? "edge";
  const fillKind = stroke.fillKind ?? "solid";
  return (
    <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "8px 10px", marginBottom: 6, border: "1px solid #e2e8f0" }}>
      {/* コントロールバー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", gap: 2 }}>
          <button onClick={onMoveUp} disabled={!onMoveUp} title="上に移動（より内側）" style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 4, color: onMoveUp ? "#64748b" : "#d1d5db", cursor: onMoveUp ? "pointer" : "default", fontSize: 11, padding: "1px 5px", lineHeight: 1 }}>↑</button>
          <button onClick={onMoveDown} disabled={!onMoveDown} title="下に移動（より外側）" style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 4, color: onMoveDown ? "#64748b" : "#d1d5db", cursor: onMoveDown ? "pointer" : "default", fontSize: 11, padding: "1px 5px", lineHeight: 1 }}>↓</button>
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
      </div>

      {/* 種類 (edge/depth) */}
      <PropRow label="種類">
        <KindSelect
          options={[["edge", "エッジ"], ["depth", "奥行"]]}
          value={kind}
          onChange={v => onChange({ kind: v as StrokeKind })}
        />
      </PropRow>

      {/* 奥行き設定 */}
      {kind === "depth" && (<>
        <PropRow label="奥行き角度">
          <SliderWithNum value={stroke.depthAngle ?? 135} min={0} max={360} unit="°" onChange={v => onChange({ depthAngle: v })} />
        </PropRow>
        <PropRow label="奥行き量">
          <SliderWithNum value={stroke.depthLen ?? 4} min={1} max={20} onChange={v => onChange({ depthLen: v })} />
        </PropRow>
      </>)}

      {/* 塗りの種類 */}
      <PropRow label="塗り種類">
        <KindSelect
          options={[["solid", "ベタ"], ["linear", "グラデーション"]]}
          value={fillKind}
          onChange={v => onChange({ fillKind: v as "solid" | "linear" })}
        />
      </PropRow>

      {/* カラー1 */}
      <PropRow label={fillKind === "linear" ? "カラー1" : "カラー"}>
        <ColorInput color={stroke.color} onChange={c => onChange({ color: c })} />
      </PropRow>

      {/* カラー2・角度・切り替わり幅 (linear) */}
      {fillKind === "linear" && (<>
        <PropRow label="カラー2">
          <ColorInput color={stroke.color2 ?? "#000000"} onChange={c => onChange({ color2: c })} />
        </PropRow>
        <PropRow label="角度">
          <SliderWithNum value={stroke.gradAngle ?? 0} min={0} max={360} unit="°" onChange={v => onChange({ gradAngle: v })} />
        </PropRow>
        <PropRow label="切り替わり幅">
          <SliderWithNum value={stroke.gradWidth ?? 100} min={0} max={100} onChange={v => onChange({ gradWidth: v })} />
        </PropRow>
      </>)}

      {/* 幅・不透明度 */}
      {kind === "edge" && (
        <PropRow label="幅"><SliderWithNum value={stroke.width} min={1} max={40} onChange={v => onChange({ width: v })} /></PropRow>
      )}
      <PropRow label="不透明度"><SliderWithNum value={stroke.opacity} min={0} max={100} unit="%" onChange={v => onChange({ opacity: v })} /></PropRow>
    </div>
  );
}

function TextAlignLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2"  width="14" height="2" rx="1"/>
      <rect x="1" y="7"  width="9"  height="2" rx="1"/>
      <rect x="1" y="12" width="11" height="2" rx="1"/>
    </svg>
  );
}
function TextAlignCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1"   y="2"  width="14" height="2" rx="1"/>
      <rect x="3.5" y="7"  width="9"  height="2" rx="1"/>
      <rect x="2.5" y="12" width="11" height="2" rx="1"/>
    </svg>
  );
}
function TextAlignRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2"  width="14" height="2" rx="1"/>
      <rect x="6" y="7"  width="9"  height="2" rx="1"/>
      <rect x="4" y="12" width="11" height="2" rx="1"/>
    </svg>
  );
}
function AlignTextLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="1.5" height="14" rx="0.75"/>
      <rect x="3.5" y="4" width="7" height="8" rx="1.5"/>
    </svg>
  );
}
function AlignTextCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="7.25" y="1" width="1.5" height="14" rx="0.75"/>
      <rect x="3" y="4" width="10" height="8" rx="1.5"/>
    </svg>
  );
}
function AlignTextRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="13.5" y="1" width="1.5" height="14" rx="0.75"/>
      <rect x="5.5" y="4" width="7" height="8" rx="1.5"/>
    </svg>
  );
}
function AlignTopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1"   width="14" height="1.5" rx="0.75"/>
      <rect x="4" y="3.5" width="8"  height="7"   rx="1.5"/>
    </svg>
  );
}
function AlignVCenterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="7.25" width="14" height="1.5" rx="0.75"/>
      <rect x="4" y="3"    width="8"  height="10"  rx="1.5"/>
    </svg>
  );
}
function AlignBottomIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="13.5" width="14" height="1.5" rx="0.75"/>
      <rect x="4" y="5.5"  width="8"  height="7"   rx="1.5"/>
    </svg>
  );
}

function ToolBtn({ active, onClick, title, children, style: extraStyle }: {
  active?: boolean; onClick: () => void; title?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button onClick={onClick} title={title} style={{
      background: active ? "#3b82f6" : "#f1f5f9", border: active ? "none" : "1.5px solid #e2e8f0",
      borderRadius: 6, color: active ? "#fff" : "#64748b", cursor: "pointer",
      fontSize: 12, fontWeight: 700, padding: "4px 9px", fontFamily: FONT, lineHeight: 1.2,
      transition: "background .15s, color .15s", ...extraStyle,
    }}>{children}</button>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const toolSelectStyle: React.CSSProperties = {
  background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 7,
  color: "#334155", fontSize: 12, padding: "5px 8px", outline: "none", cursor: "pointer",
};
const addBtnStyle: React.CSSProperties = {
  background: "none", border: "1.5px solid #e2e8f0", borderRadius: 5,
  color: "#64748b", cursor: "pointer", fontSize: 10, padding: "2px 8px", fontFamily: FONT, fontWeight: 600,
};
const srcBtnStyle: React.CSSProperties = {
  flex: 1, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 7,
  color: "#475569", cursor: "pointer", fontSize: 11, padding: "6px 4px",
  fontFamily: FONT, fontWeight: 600, textAlign: "center",
};
const primaryBtnStyle: React.CSSProperties = {
  background: GRAD, border: "none", borderRadius: 9,
  color: "#fff", fontSize: 13, fontWeight: 700, padding: "9px 24px", fontFamily: FONT,
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "none", border: "1.5px solid #5184F0", borderRadius: 9,
  color: "#5184F0", fontSize: 13, fontWeight: 700, padding: "9px 24px", fontFamily: FONT,
};
