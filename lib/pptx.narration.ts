import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { getEditJsonFromR2, putEditJsonToR2 } from "@/lib/project.r2";
import { logError } from "@/lib/log.error";
import { CREDIT_COST, FREE_NARRATION_IMPORTS, consumeCredits, isFreePlan, narrationMultiplier, refundCredits } from "@/lib/credits";
import { GEMINI_TTS_MODELS, GEMINI_VOICES } from "@/lib/ttsSettings";
import { callGeminiTts, chunkText, mergeWavs, wavSeconds } from "@/lib/tts.gemini";
import { ImportError, finishImport, narrationFile } from "@/lib/pptx.import";
import type { ImportOptions, ImportWarning, PptxManifest, SlideNarration } from "@/lib/pptx.import";

const PARALLEL = 3;

type Job = { id: string; userId: string; workspaceId: string; outPrefix: string; manifestKey: string | null; options: unknown };
type Charge = { free: true } | { free: false; mult: number };

export type NarrationEstimate = {
  slides: number;
  withNotes: number;
  chars: number;
  credits: number;
  balance: number;
  free: boolean;
  freeLeft: number;
  freeLimit: number;
};

const notedSlides = (m: PptxManifest) => m.slides.filter((s) => s.notes?.trim());

export async function narrationEstimate(job: Job): Promise<NarrationEstimate | null> {
  const manifest = job.manifestKey ? await getEditJsonFromR2<PptxManifest>(job.manifestKey) : null;
  const user = await prisma.user.findUnique({ where: { id: job.userId }, select: { plan: true, credits: true, freeNarrationImports: true } });
  if (!manifest || !user) return null;
  const noted = notedSlides(manifest);
  const mult = noted.reduce((n, s) => n + narrationMultiplier(s.notes.trim()), 0);
  return {
    slides: manifest.slides.length,
    withNotes: noted.length,
    chars: noted.reduce((n, s) => n + s.notes.trim().length, 0),
    credits: CREDIT_COST.narration * mult,
    balance: user.credits,
    free: isFreePlan(user.plan),
    freeLeft: Math.max(0, FREE_NARRATION_IMPORTS - user.freeNarrationImports),
    freeLimit: FREE_NARRATION_IMPORTS,
  };
}

// 無料プランは回数（アカウント累計・リセットなし）、有料プランはクレジットで払う
async function charge(job: Job, manifest: PptxManifest): Promise<{ ok: true; charge: Charge } | { ok: false; message: string }> {
  const user = await prisma.user.findUnique({ where: { id: job.userId }, select: { plan: true } });
  if (isFreePlan(user?.plan)) {
    const { count } = await prisma.user.updateMany({
      where: { id: job.userId, freeNarrationImports: { lt: FREE_NARRATION_IMPORTS } },
      data: { freeNarrationImports: { increment: 1 } },
    });
    if (count === 0) return { ok: false, message: `無料プランのナレーション生成は ${FREE_NARRATION_IMPORTS} 回までです。続けるには有料プランをご利用ください` };
    return { ok: true, charge: { free: true } };
  }
  const mult = notedSlides(manifest).reduce((n, s) => n + narrationMultiplier(s.notes.trim()), 0);
  const res = await consumeCredits(job.userId, "narration", job.workspaceId, mult);
  if (!res.ok) return { ok: false, message: res.message ?? "クレジットが不足しています" };
  return { ok: true, charge: { free: false, mult } };
}

async function refund(job: Job, c: Charge, mult?: number) {
  if (c.free) {
    await prisma.user.updateMany({ where: { id: job.userId, freeNarrationImports: { gt: 0 } }, data: { freeNarrationImports: { decrement: 1 } } });
  } else {
    await refundCredits(job.userId, "narration", job.workspaceId, mult ?? c.mult);
  }
}

// 確認画面の「ナレーションを作る / 作らない」。二重に払わないよう、状態を先に confirm → narrating にしてから払う
export async function confirmNarration(job: Job, generate: boolean): Promise<{ ok: boolean; message?: string; status?: number }> {
  const { count } = await prisma.importJob.updateMany({ where: { id: job.id, status: "confirm" }, data: { status: "narrating" } });
  if (count === 0) return { ok: false, message: "この取り込みはすでに進んでいます", status: 409 };

  const manifest = job.manifestKey ? await getEditJsonFromR2<PptxManifest>(job.manifestKey) : null;
  if (!manifest) {
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "error", message: "変換結果を読み込めませんでした" } });
    return { ok: false, message: "変換結果を読み込めませんでした", status: 500 };
  }

  if (!generate) {
    void build(job, manifest, null);
    return { ok: true };
  }

  const paid = await charge(job, manifest);
  if (!paid.ok) {
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "confirm" } });
    return { ok: false, message: paid.message, status: 402 };
  }
  void build(job, manifest, paid.charge);
  return { ok: true };
}

async function build(job: Job, manifest: PptxManifest, c: Charge | null) {
  const opts = job.options as unknown as ImportOptions;
  let refunded = 0;
  try {
    const { narration, warnings, failedMult } = c ? await generateAll(job, manifest, opts.narration?.voice ?? "Kore") : { narration: undefined, warnings: [], failedMult: 0 };
    if (c && narration && narration.size === 0) throw new ImportError("ナレーションを生成できませんでした。しばらくしてからもう一度お試しください");
    if (c && !c.free && failedMult > 0) { await refund(job, c, failedMult); refunded = failedMult; }
    await finishImport(job, manifest, job.manifestKey!, opts, narration, warnings);
  } catch (e) {
    if (c && c.free) await refund(job, c);
    if (c && !c.free && c.mult > refunded) await refund(job, c, c.mult - refunded);
    const message = e instanceof ImportError ? e.message : "ナレーションの生成中にエラーが発生しました";
    if (!(e instanceof ImportError)) await logError("import-pptx-narration", `${e}`, { userId: job.userId, detail: { jobId: job.id } });
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "error", message } });
  }
}

// ノートのあるスライドだけ読み上げる。失敗したスライドは無音にして警告を出し、その分のクレジットは返す
async function generateAll(job: Job, manifest: PptxManifest, voiceName: string) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY が設定されていません");
  const voice = (GEMINI_VOICES as readonly string[]).includes(voiceName) ? voiceName : "Kore";
  const model = GEMINI_TTS_MODELS[0].providerModelId;

  const targets = notedSlides(manifest);
  const narration: SlideNarration = new Map();
  const warnings: ImportWarning[] = [];
  let failedMult = 0;
  let done = 0;
  const progress = () => putEditJsonToR2(`${job.outPrefix}/progress.json`, { stage: "narration", done, total: targets.length, at: Date.now() }).catch(() => {});
  await progress();

  const queue = [...targets];
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    for (let s = queue.shift(); s; s = queue.shift()) {
      const text = s.notes.trim();
      try {
        const wavs: Buffer[] = [];
        for (const chunk of chunkText(text, 500)) wavs.push(await callGeminiTts(model, chunk, "", voice, apiKey, 2));
        const wav = mergeWavs(wavs);
        const key = `${job.outPrefix}/${narrationFile(s.no)}`;
        await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: wav, ContentType: "audio/wav" }));
        narration.set(s.no, { src: `${R2_PUBLIC_URL}/${key}`, sec: Math.round(wavSeconds(wav) * 100) / 100 });
      } catch (e) {
        failedMult += narrationMultiplier(text);
        warnings.push({ slide: s.no, code: "NARRATION_FAILED", message: `${s.no} 枚目のナレーションを生成できなかったため、無音にしました` });
        await logError("import-pptx-narration", `${e}`, { userId: job.userId, detail: { jobId: job.id, slide: s.no } });
      }
      done++;
      await progress();
    }
  }));
  return { narration, warnings, failedMult };
}
