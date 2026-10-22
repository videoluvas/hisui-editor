import { getPresignedUrl } from "@/lib/fileupload.front";

// ─── クリップ操作パネル用の画像まわり ─────────────────────────────────────────

function loadImage(src: string, cors: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (cors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("画像を読み込めませんでした"));
    img.src = src;
  });
}

// 大きさと透過の有無（透過のある画像は動画化しない）。CORS で画素が読めないときは透過なし扱い
export async function imageInfo(url: string): Promise<{ width: number; height: number; hasAlpha: boolean }> {
  const img = await loadImage(url, true);
  const { naturalWidth: width, naturalHeight: height } = img;
  if (/\.jpe?g(\?|$)/i.test(url)) return { width, height, hasAlpha: false };
  try {
    const scale = Math.min(1, 256 / Math.max(width, height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(width * scale));
    c.height = Math.max(1, Math.round(height * scale));
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 250) return { width, height, hasAlpha: true };
    return { width, height, hasAlpha: false };
  } catch {
    return { width, height, hasAlpha: false };
  }
}

const RATIOS = ["16:9", "9:16", "4:3", "3:4", "1:1"] as const;

export function nearestRatio(w: number, h: number): string {
  if (!(w > 0 && h > 0)) return "16:9";
  const r = w / h;
  return RATIOS.reduce((best, cur) => {
    const [a, b] = cur.split(":").map(Number);
    const [x, y] = best.split(":").map(Number);
    return Math.abs(Math.log(a / b / r)) < Math.abs(Math.log(x / y / r)) ? cur : best;
  }, RATIOS[0] as string);
}

type RasterClip = {
  width?: number; height?: number;
  asset?: {
    type?: string; src?: string; text?: string;
    font?: { family?: string; size?: number; weight?: number; color?: string };
    align?: { horizontal?: string };
  };
};

// 字幕ツールの文字・図形（svg）を PNG にする（AI で装飾の参照画像に使う）
export async function rasterizeClip(clip: RasterClip): Promise<Blob> {
  const w = Math.round(clip.width ?? 512);
  const h = Math.round(clip.height ?? 512);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  const a = clip.asset ?? {};

  if (a.type === "svg" && a.src) {
    const url = URL.createObjectURL(new Blob([a.src], { type: "image/svg+xml" }));
    try { ctx.drawImage(await loadImage(url, false), 0, 0, w, h); } finally { URL.revokeObjectURL(url); }
  } else {
    const size = a.font?.size ?? 72;
    ctx.font = `${a.font?.weight ?? 400} ${size}px "Noto Sans JP", sans-serif`;
    ctx.fillStyle = a.font?.color ?? "#ffffff";
    ctx.textBaseline = "middle";
    const hz = a.align?.horizontal ?? "center";
    ctx.textAlign = hz === "left" ? "left" : hz === "right" ? "right" : "center";
    const x = hz === "left" ? 0 : hz === "right" ? w : w / 2;
    const lines = (a.text ?? "").split("\n");
    const lh = size * 1.3;
    lines.forEach((line, i) => ctx.fillText(line, x, h / 2 + (i - (lines.length - 1) / 2) * lh));
  }
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("画像にできませんでした"))), "image/png"));
}

export async function uploadBlob(blob: Blob, name: string, projectId?: string, workspaceId?: string | null): Promise<string> {
  const file = new File([blob], name, { type: blob.type });
  const pres = await getPresignedUrl(file, projectId, workspaceId);
  if (!pres.ok || !pres.presignedUrl || !pres.fileUrl) throw new Error(pres.message ?? "アップロードURLの取得に失敗しました");
  const up = await fetch(pres.presignedUrl, { method: "PUT", headers: { "Content-Type": blob.type }, body: blob });
  if (!up.ok) throw new Error("アップロードに失敗しました");
  return pres.fileUrl;
}
