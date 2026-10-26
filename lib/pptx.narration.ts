import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { getEditJsonFromR2, putEditJsonToR2 } from "@/lib/project.r2";
import { logError } from "@/lib/log.error";
import { CREDIT_COST, consumeCredits, hasAiAccess, isFreePlan, narrationMultiplier, refundCredits } from "@/lib/credits";
import { FREE_LIMITS, STANDARD_LIMITS } from "@/lib/pricing";
import { returnNarrationChars, useNarrationChars } from "@/lib/plan-usage";
import { GEMINI_TTS_MODELS, GEMINI_VOICES } from "@/lib/ttsSettings";
import { callGeminiTts, chunkText, mergeWavs, wavSeconds } from "@/lib/tts.gemini";
import { ImportError, finishImport, narrationFile } from "@/lib/pptx.import";
import type { ImportOptions, ImportWarning, PptxManifest, SlideNarration } from "@/lib/pptx.import";

const PARALLEL = 3;

type Job = { id: string; userId: string; workspaceId: string; outPrefix: string; manifestKey: string | null; options: unknown };
// 無料：回数（累計・リセットなし）、スタンダード：今月の文字数、法人：クレジットで払う
type ChargeKind = "free" | "chars" | "credits";
type Charge = { kind: "free" } | { kind: "chars"; chars: number } | { kind: "credits"; mult: number };

export type NarrationEstimate = {
  slides: number;
  withNotes: number;
  chars: number;
  kind: ChargeKind;
  credits: number;
  balance: number;
  freeLeft: number;
  freeLimit: number;
  charsLeft: number;
  charsLimit: number;
  blocked: string | null;
};

const notedSlides = (m: PptxManifest) => m.slides.filter((s) => s.notes?.trim());
const chargeKind = (plan: string | null): ChargeKind => isFreePlan(plan) ? "free" : hasAiAccess(plan) ? "credits" : "chars";

function measure(manifest: PptxManifest) {
  const noted = notedSlides(manifest);
  return {
    withNotes: noted.length,
    chars: noted.reduce((n, s) => n + s.notes.trim().length, 0),
    mult: noted.reduce((n, s) => n + narrationMultiplier(s.notes.trim()), 0),
  };
}

// 作れないときの理由（作れるなら null）
function blockReason(kind: ChargeKind, m: { withNotes: number; chars: number; mult: number }, u: { credits: number; freeNarrationImports: number; narrationChars: number }) {
  if (kind === "free") {
    if (u.freeNarrationImports >= FREE_LIMITS.narrationImports) return `無料プランのナレーション生成は ${FREE_LIMITS.narrationImports} 回まで使いました。`;
    if (m.withNotes > FREE_LIMITS.narrationSlides) return `無料プランで 1 回に読み上げられるのは ${FREE_LIMITS.narrationSlides} 枚までです（ノートのあるスライドが ${m.withNotes} 枚）。`;
    if (m.chars > FREE_LIMITS.narrationChars) return `無料プランで 1 回に読み上げられるのは ${FREE_LIMITS.narrationChars.toLocaleString()} 字までです（今回 ${m.chars.toLocaleString()} 字）。`;
    return null;
  }
  if (kind === "chars") {
    const left = STANDARD_LIMITS.narrationChars - u.narrationChars;
    return m.chars > left ? `今月のナレーションの残りは ${Math.max(0, left).toLocaleString()} 字です（今回 ${m.chars.toLocaleString()} 字）。` : null;
  }
  return u.credits < CREDIT_COST.narration * m.mult ? "クレジットが足りません。" : null;
}

const userSelect = { plan: true, credits: true, freeNarrationImports: true, narrationChars: true } as const;

export async function narrationEstimate(job: Job): Promise<NarrationEstimate | null> {
  const manifest = job.manifestKey ? await getEditJsonFromR2<PptxManifest>(job.manifestKey) : null;
  const user = await prisma.user.findUnique({ where: { id: job.userId }, select: userSelect });
  if (!manifest || !user) return null;
  const m = measure(manifest);
  const kind = chargeKind(user.plan);
  return {
    slides: manifest.slides.length,
    withNotes: m.withNotes,
    chars: m.chars,
    kind,
    credits: CREDIT_COST.narration * m.mult,
    balance: user.credits,
    freeLeft: Math.max(0, FREE_LIMITS.narrationImports - user.freeNarrationImports),
    freeLimit: FREE_LIMITS.narrationImports,
    charsLeft: Math.max(0, STANDARD_LIMITS.narrationChars - user.narrationChars),
    charsLimit: STANDARD_LIMITS.narrationChars,
    blocked: blockReason(kind, m, user),
  };
}

async function charge(job: Job, manifest: PptxManifest): Promise<{ ok: true; charge: Charge } | { ok: false; message: string }> {
  const user = await prisma.user.findUnique({ where: { id: job.userId }, select: userSelect });
  if (!user) return { ok: false, message: "ユーザーが見つかりません" };
  const m = measure(manifest);
  const kind = chargeKind(user.plan);
  const blocked = blockReason(kind, m, user);
  if (blocked) return { ok: false, message: blocked };
  if (kind === "free") {
    const { count } = await prisma.user.updateMany({
      where: { id: job.userId, freeNarrationImports: { lt: FREE_LIMITS.narrationImports } },
      data: { freeNarrationImports: { increment: 1 } },
    });
    if (count === 0) return { ok: false, message: `無料プランのナレーション生成は ${FREE_LIMITS.narrationImports} 回まで使いました。` };
    return { ok: true, charge: { kind } };
  }
  if (kind === "chars") {
    if (!(await useNarrationChars(job.userId, m.chars))) return { ok: false, message: "今月のナレーションの文字数が足りません。" };
    return { ok: true, charge: { kind, chars: m.chars } };
  }
  const res = await consumeCredits(job.userId, "narration", job.workspaceId, m.mult);
  if (!res.ok) return { ok: false, message: res.message ?? "クレジットが不足しています" };
  return { ok: true, charge: { kind, mult: m.mult } };
}

// 返す量（failed）を省くと全部返す
async function refund(job: Job, c: Charge, failed?: { chars: number; mult: number }) {
  if (c.kind === "free") {
    await prisma.user.updateMany({ where: { id: job.userId, freeNarrationImports: { gt: 0 } }, data: { freeNarrationImports: { decrement: 1 } } });
  } else if (c.kind === "chars") {
    await returnNarrationChars(job.userId, failed?.chars ?? c.chars);
  } else {
    await refundCredits(job.userId, "narration", job.workspaceId, failed?.mult ?? c.mult);
  }
}

// 確認画面の「ナレーションを作る / 作らない」。二重に払わないよう、状態を先に confirm → narrating にしてから払う
export async function confirmNarration(job: Job, generate: boolean): Promise<{ ok: boolean; message?: string; status?: number }> {
  const { count } = await prisma.importJob.updateMany({ where: { id: job.id, status: "confirm" }, data: { status: "narrating" } });
  if (count === 0) return { ok: false, message: "この取り込みはすでに進んでいます", status: 409 };

  const manifest = job.manifestKey ? await getEditJsonFromR2<PptxManifest>(job.manifestKey) : null;
  if (!manifest) {
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "error", message: "変換結果を読み込めませんでした", errorCode: "CONVERT_FAILED" } });
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
  let refunded = { chars: 0, mult: 0 };
  try {
    const { narration, warnings, failed } = c ? await generateAll(job, manifest, opts.narration?.voice ?? "Kore") : { narration: undefined, warnings: [], failed: { chars: 0, mult: 0 } };
    if (c && narration && narration.size === 0) throw new ImportError("ナレーションを生成できませんでした。しばらくしてからもう一度お試しください");
    // 一部のスライドだけ失敗したときは、その分の文字数・クレジットを返す（無料の回数は 1 回使ったまま）
    if (c && c.kind !== "free" && failed.chars > 0) { await refund(job, c, failed); refunded = failed; }
    await finishImport(job, manifest, job.manifestKey!, opts, narration, warnings);
  } catch (e) {
    if (c?.kind === "free") await refund(job, c);
    if (c?.kind === "chars" && c.chars > refunded.chars) await refund(job, c, { chars: c.chars - refunded.chars, mult: 0 });
    if (c?.kind === "credits" && c.mult > refunded.mult) await refund(job, c, { chars: 0, mult: c.mult - refunded.mult });
    const message = e instanceof ImportError ? e.message : "ナレーションの生成中にエラーが発生しました";
    if (!(e instanceof ImportError)) await logError("import-pptx-narration", `${e}`, { userId: job.userId, detail: { jobId: job.id } });
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "error", message, errorCode: "NARRATION_FAILED" } });
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
  const failed = { chars: 0, mult: 0 };
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
        failed.chars += text.length;
        failed.mult += narrationMultiplier(text);
        warnings.push({ slide: s.no, code: "NARRATION_FAILED", message: `${s.no} 枚目のナレーションを生成できなかったため、無音にしました` });
        await logError("import-pptx-narration", `${e}`, { userId: job.userId, detail: { jobId: job.id, slide: s.no } });
      }
      done++;
      await progress();
    }
  }));
  return { narration, warnings, failed };
}
