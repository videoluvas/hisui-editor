import { DeleteObjectsCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { prisma } from "@/lib/prisma";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { getEditJsonFromR2 } from "@/lib/project.r2";
import { buildEditJson, createProjectFromEditJson } from "@/lib/timeline.build";
import type { TimelineClip, TimelineSegment } from "@/lib/timeline.build";
import { logError } from "@/lib/log.error";
import { IMPORT_GUIDES } from "@/lib/errorGuide";
import { PPTX_MIME } from "@/lib/pptx.import.shared";
import { RECOMMENDED_ANIMATIONS, STAGGER_SEC, animationToTransition, slideTransitionToTransition, withSpeed } from "@/lib/pptx.effects";
import type { AnimSetting, AnimSettings, PptxAnimation, PptxTransition } from "@/lib/pptx.effects";

export const IMPORT_MAX_BYTES = 200 * 1024 * 1024;
const CONVERT_TIMEOUT_MS = 15 * 60 * 1000;

export type ImportOptions = {
  title?: string;
  secPerSlide: number;
  animationMode?: "recommended" | "custom";
  animations?: AnimSettings;   // カスタマイズ時の対象ごとの設定
  stagger?: boolean;
  narration?: { voice: string };   // ノートからナレーションを作る（変換後に確認画面を挟む）
};

// ナレーションありのスライドは、前後に余白を付けた長さにする
export const NARRATION_PAD_SEC = 0.5;
export type SlideNarration = Map<number, { src: string; sec: number }>;

type ManifestObject = {
  id: string; name: string; kind: string; z: number; text: string; placeholder: string | null;
  file?: string; x?: number; y?: number; w?: number; h?: number; source?: string;
  media?: { file: string; type: "video" | "audio" };
  animations: PptxAnimation[];
};

export type ImportWarning = { slide: number; code: string; message: string };

export type PptxManifest = {
  version: number;
  width: number;
  height: number;
  slides: { no: number; title: string; notes: string; transition: PptxTransition | null; background: string; objects: ManifestObject[] }[];
  warnings: ImportWarning[];
};

export function importPrefix(userId: string, workspaceId: string, jobId: string) {
  return `user/${userId}/${workspaceId}/import/${jobId}`;
}

export async function presignInputs(inputPrefix: string) {
  const sign = (name: string, type: string) =>
    getSignedUrl(r2Client, new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: `${inputPrefix}/${name}`, ContentType: type }), { expiresIn: 900 });
  const [pptxUrl, pdfUrl] = await Promise.all([sign("in.pptx", PPTX_MIME), sign("in.pdf", "application/pdf")]);
  return { pptxUrl, pdfUrl };
}

function objectClip(no: number, o: ManifestObject, W: number, H: number, src: string): TimelineClip {
  const clip: TimelineClip = { id: `pptx-s${no}-o${o.id}`, asset: { type: "image", src } };
  if (o.x == null || o.y == null || !o.w || !o.h) return { ...clip, fit: "contain" };
  // width/height（px）は書き出し解像度を変えると崩れるため、画面比の scale で大きさを決める
  // topLeft は Studio が画像の実ピクセル（表示倍率で変わる）で位置を計算してずれるため、中心基準にする
  const scale = o.w / o.h >= W / H ? o.w / W : o.h / H;
  const r = (v: number) => Math.round(v * 100000) / 100000;
  return {
    ...clip,
    fit: "contain",
    scale: r(scale),
    position: "center",
    offset: { x: r((o.x + o.w / 2) / W - 0.5), y: -r((o.y + o.h / 2) / H - 0.5) },
  };
}

// 登場は開始を遅らせて transition.in、退場はそこで終わらせて transition.out。対応外は数だけ返す
function applyAnimations(clip: TimelineClip, anims: PptxAnimation[], len: number): { clip: TimelineClip; skipped: number; entered: boolean } {
  let skipped = 0;
  let entered = false;
  const transition: Record<string, string> = {};
  const out = { ...clip };
  for (const a of anims) {
    const t = animationToTransition(a);
    if (t == null) { skipped++; continue; }
    if (a.presetClass === "entr" && !entered) {
      entered = true;
      out.startOffset = Math.min(a.start / 1000, len);
      if (t) transition.in = t;
    } else if (a.presetClass === "exit" && out.length == null) {
      const end = Math.min((a.start + a.duration) / 1000, len);
      out.length = Math.max(0.1, end - (out.startOffset ?? 0));
      if (t) transition.out = t;
    }
  }
  if (Object.keys(transition).length) out.transition = transition;
  return { clip: out, skipped, entered };
}

// 対象（文字・図形 / 埋め込み画像 / 動画 / 背景）ごとの設定。おすすめ設定は RECOMMENDED_ANIMATIONS
function animSettings(opts: ImportOptions): AnimSettings {
  return opts.animationMode === "custom" && opts.animations ? opts.animations : RECOMMENDED_ANIMATIONS;
}

function resolve(s: AnimSetting): { in: string; effect: string | null } {
  return { in: withSpeed(s.in, s.speed), effect: s.effect !== "none" ? `${s.effect}Slow` : null };
}

function autoAnimation(o: ManifestObject, opts: ImportOptions): { in: string; effect: string | null } {
  const set = animSettings(opts);
  if (o.media) return o.media.type === "video" ? resolve(set.video) : { in: "none", effect: null };
  if (!o.file) return { in: "none", effect: null };
  return resolve(o.kind === "picture" ? set.image : set.text);
}

export function manifestToSegments(m: PptxManifest, outPrefix: string, opts: ImportOptions, narration?: SlideNarration) {
  const url = (file: string) => `${R2_PUBLIC_URL}/${outPrefix}/${file}`;
  const warnings: ImportWarning[] = [];
  const segments: TimelineSegment[] = m.slides.map((s) => {
    const voice = narration?.get(s.no);
    const len = voice ? Math.round((voice.sec + NARRATION_PAD_SEC * 2) * 100) / 100 : opts.secPerSlide;
    const slideIn = s.transition ? slideTransitionToTransition(s.transition) : "";
    if (slideIn == null)
      warnings.push({ slide: s.no, code: "TRANSITION_UNSUPPORTED", message: `${s.no} 枚目の画面切り替え効果は反映できないため、切り替えなしにしました` });
    const withSlideIn = (clip: TimelineClip): TimelineClip =>
      slideIn ? { ...clip, transition: { ...(clip.transition as object | undefined), in: slideIn } } : clip;

    // 自動で付ける登場（自前の登場アニメーションがないものだけ）を上から順に並べ、順番表示の遅れに使う
    const auto = new Map(s.objects.map((o) => [o.id, autoAnimation(o, opts)]));
    const plain = s.objects
      .filter((o) => auto.get(o.id)!.in !== "none" && !o.animations.some((a) => a.presetClass === "entr" && animationToTransition(a) != null))
      .sort((a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0));
    const order = new Map(plain.map((o, i) => [o.id, i]));

    // 背景：PowerPoint の画面切り替えがあればそれを優先し、なければ自動アニメーションの設定を使う
    const bgAuto = resolve(animSettings(opts).background);
    const bgClip: TimelineClip = { id: `pptx-s${s.no}-bg`, asset: { type: "image", src: url(s.background) }, fit: "cover" };
    if (bgAuto.effect) bgClip.effect = bgAuto.effect;
    const layers: TimelineClip[] = [slideIn || bgAuto.in === "none" ? withSlideIn(bgClip) : { ...bgClip, transition: { in: bgAuto.in } }];
    let skipped = 0;
    for (const o of s.objects) {
      let clip: TimelineClip | null = null;
      if (o.media?.type === "audio") {
        clip = { id: `pptx-s${s.no}-o${o.id}`, asset: { type: "audio", src: url(o.media.file), volume: 1 } };
      } else if (o.media?.type === "video") {
        clip = { ...objectClip(s.no, o, m.width, m.height, url(o.media.file)), asset: { type: "video", src: url(o.media.file), volume: 1 } };
      } else if (o.file) {
        clip = objectClip(s.no, o, m.width, m.height, url(o.file));
      }
      if (!clip) continue;
      const res = applyAnimations(clip, o.animations, len);
      const { in: autoIn, effect } = auto.get(o.id)!;
      if (effect) res.clip.effect = effect;
      skipped += res.skipped;
      const idx = order.get(o.id);
      if (idx != null && !res.entered) {
        layers.push({
          ...res.clip,
          startOffset: opts.stagger ? Math.round(Math.min(idx * STAGGER_SEC, len / 2) * 100) / 100 : 0,
          transition: { ...(res.clip.transition as object | undefined), in: autoIn },
        });
      } else {
        layers.push(res.entered || o.media?.type === "audio" ? res.clip : withSlideIn(res.clip));
      }
    }
    if (skipped > 0)
      warnings.push({ slide: s.no, code: "ANIMATION_UNSUPPORTED", message: `${s.no} 枚目のアニメーションのうち ${skipped} 件は反映できないため、そのまま表示します` });
    return { length: len, layers, ...(voice ? { audio: { src: voice.src, volume: 1, offset: NARRATION_PAD_SEC, length: voice.sec } } : {}) };
  });
  return { segments, warnings };
}

async function deleteInputs(inputPrefix: string | null) {
  if (!inputPrefix) return;
  await r2Client.send(new DeleteObjectsCommand({
    Bucket: R2_BUCKET_NAME,
    Delete: { Objects: [{ Key: `${inputPrefix}/in.pptx` }, { Key: `${inputPrefix}/in.pdf` }] },
  })).catch(() => {});
}

export async function runImport(jobId: string) {
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job || !job.inputPrefix) return;
  const opts = job.options as unknown as ImportOptions;

  try {
    const res = await fetch(`${process.env.PPTX_CONVERTER_URL}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.CONVERTER_SHARED_SECRET}` },
      body: JSON.stringify({
        jobId,
        pptxKey: `${job.inputPrefix}/in.pptx`,
        pdfKey: `${job.inputPrefix}/in.pdf`,
        outPrefix: job.outPrefix,
      }),
      signal: AbortSignal.timeout(CONVERT_TIMEOUT_MS),
    });
    const result = await res.json().catch(() => ({ ok: false, code: "INTERNAL", message: `変換サービスの応答が不正です（${res.status}）` }));
    // ファイルの中身が原因のもの（枚数・縦横比の不一致など）はそのまま見せ、内部エラーは記録して一般的な文言にする
    if (!result.ok) {
      if (result.code && IMPORT_GUIDES[result.code]) throw new ImportError(result.message ?? "変換に失敗しました", result.code);
      await logError("import-pptx", result.message ?? "変換に失敗しました", { userId: job.userId, detail: { jobId, code: result.code } });
      throw new ImportError("変換中にエラーが発生しました");
    }

    const manifest = await getEditJsonFromR2<PptxManifest>(result.manifestKey);
    if (!manifest) throw new ImportError("変換結果を読み込めませんでした");

    // ナレーションを作る場合は、ノートの文字数と消費クレジットを画面で確認してから続ける（lib/pptx.narration.ts）
    if (opts.narration && manifest.slides.some((s) => s.notes?.trim())) {
      await prisma.importJob.update({ where: { id: jobId }, data: { status: "confirm", manifestKey: result.manifestKey, inputPrefix: null } });
      return;
    }
    await finishImport(job, manifest, result.manifestKey, opts);
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    const message = e instanceof ImportError ? e.message : timeout ? "変換が時間内に終わりませんでした" : "取り込み中にエラーが発生しました";
    const errorCode = e instanceof ImportError ? e.code : timeout ? "TIMEOUT" : "CONVERT_FAILED";
    if (!(e instanceof ImportError)) await logError("import-pptx", `${e}`, { userId: job.userId, detail: { jobId } });
    await prisma.importJob.update({ where: { id: jobId }, data: { status: "error", message, errorCode, inputPrefix: null } });
  } finally {
    await deleteInputs(job.inputPrefix);
  }
}

export async function finishImport(
  job: { id: string; userId: string; workspaceId: string; outPrefix: string },
  manifest: PptxManifest,
  manifestKey: string,
  opts: ImportOptions,
  narration?: SlideNarration,
  extraWarnings: ImportWarning[] = [],
) {
  const size = { width: manifest.width, height: manifest.height, fps: 30, backgroundColor: "#000000" };
  const { segments, warnings } = manifestToSegments(manifest, job.outPrefix, opts, narration);
  const { editJson, duration } = buildEditJson(segments, size);
  const project = await createProjectFromEditJson({
    userId: job.userId,
    workspaceId: job.workspaceId,
    title: opts.title?.trim() || manifest.slides[0]?.title || "パワーポイント",
    size,
    editJson,
    duration,
  });

  await registerFiles(manifest, job, project.id, narration);

  await prisma.importJob.update({
    where: { id: job.id },
    data: { status: "done", manifestKey, projectId: project.id, warnings: [...manifest.warnings, ...warnings, ...extraWarnings].sort((a, b) => a.slide - b.slide), inputPrefix: null },
  });
}

export class ImportError extends Error {
  constructor(message: string, public code = "CONVERT_FAILED") {
    super(message);
  }
}

export const narrationFile = (no: number) => `narration/s${no}.wav`;

const MIME: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", wmv: "video/x-ms-wmv",
  mp3: "audio/mpeg", m4a: "audio/mp4", wav: "audio/wav", aac: "audio/aac",
};

// 変換した画像・メディアをファイル一覧に登録する（画面側でプロジェクト名のフォルダに振り分け）
async function registerFiles(m: PptxManifest, job: { userId: string; workspaceId: string; outPrefix: string }, projectId: string, narration?: SlideNarration) {
  const rows: { file: string; name: string; width?: number; height?: number }[] = [];
  for (const s of m.slides) {
    const no = String(s.no).padStart(2, "0");
    rows.push({ file: s.background, name: `${no}_背景.jpg`, width: m.width, height: m.height });
    for (const o of s.objects) {
      const label = (o.name || o.kind).replace(/[\\/:*?"<>|]/g, "_");
      if (o.file) rows.push({ file: o.file, name: `${no}_${label}.png`, width: o.w, height: o.h });
      if (o.media) rows.push({ file: o.media.file, name: `${no}_${label}.${o.media.file.split(".").pop()}` });
    }
    if (narration?.has(s.no)) rows.push({ file: narrationFile(s.no), name: `${no}_ナレーション.wav` });
  }
  const base = Date.now();
  await prisma.file.createMany({
    skipDuplicates: true,
    data: rows.map((r, i) => {
      const ext = r.file.split(".").pop()!.toLowerCase();
      const mimeType = MIME[ext] ?? "application/octet-stream";
      const storageKey = `${job.outPrefix}/${r.file}`;
      return {
        userId: job.userId,
        workspaceId: job.workspaceId,
        projectId,
        storageKey,
        fileUrl: `${R2_PUBLIC_URL}/${storageKey}`,
        fileName: r.name,
        fileType: mimeType.split("/")[0],
        mimeType,
        width: r.width ?? null,
        height: r.height ?? null,
        createdAt: new Date(base - i),
      };
    }),
  });
}
