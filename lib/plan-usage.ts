import { prisma } from "@/lib/prisma";
import { FREE_LIMITS, FREE_PLAN_CODE, STANDARD_LIMITS } from "@/lib/pricing";
import { consumeCredits, hasAiAccess, isFreePlan, narrationMultiplier, refundCredits } from "@/lib/credits";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

// 月の枠は毎月の更新日（credits_reset_at。cron/reset-monthly-credits で更新）から数える
export const periodStart = (resetAt: Date | null) => resetAt ?? new Date(Date.now() - MONTH_MS);

export type PlanUsage = {
  plan: string;
  exports: number; exportsLimit: number | null;
  cleanExportSec: number; cleanExportLimitSec: number | null;
  narrationImports: number; narrationImportsLimit: number | null;
  narrationChars: number; narrationCharsLimit: number | null;
};

export async function getPlanUsage(userId: string): Promise<PlanUsage | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, creditsResetAt: true, freeNarrationImports: true, narrationChars: true } });
  if (!user) return null;
  const plan = user.plan ?? "Free";
  const [exports, clean] = await Promise.all([
    prisma.logOutput.count({ where: { userId, status: { not: "failed" } } }),
    prisma.logOutput.aggregate({ where: { userId, sandbox: false, status: { not: "failed" }, createdAt: { gte: periodStart(user.creditsResetAt) } }, _sum: { durationSec: true } }),
  ]);
  const free = plan === "Free";
  const standard = plan === "Business";
  return {
    plan,
    exports, exportsLimit: free ? FREE_LIMITS.exports : null,
    cleanExportSec: clean._sum.durationSec ?? 0, cleanExportLimitSec: standard ? STANDARD_LIMITS.cleanExportMin * 60 : null,
    narrationImports: user.freeNarrationImports, narrationImportsLimit: free ? FREE_LIMITS.narrationImports : null,
    narrationChars: user.narrationChars, narrationCharsLimit: standard ? STANDARD_LIMITS.narrationChars : null,
  };
}

// スタンダードの今月のナレーション文字数。足りなければ使わずに false
export async function useNarrationChars(userId: string, chars: number): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, narrationChars: { lte: STANDARD_LIMITS.narrationChars - chars } },
    data: { narrationChars: { increment: chars } },
  });
  return count > 0;
}

export async function returnNarrationChars(userId: string, chars: number): Promise<void> {
  await prisma.user.updateMany({ where: { id: userId, narrationChars: { gte: chars } }, data: { narrationChars: { decrement: chars } } });
}

// 編集画面のナレーション作り直し：スタンダードで唯一使える AI 生成（今月の文字数から引く）。法人はクレジット、無料は使えない
export type NarrationCharge = { kind: "chars"; chars: number } | { kind: "credits"; mult: number };

export async function chargeNarration(userId: string, text: string, workspaceId: string | null): Promise<{ ok: true; charge: NarrationCharge } | { ok: false; code?: string; message: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { plan: true, narrationChars: true } });
  if (!user) return { ok: false, message: "ユーザーが見つかりません" };
  if (hasAiAccess(user.plan)) {
    const mult = narrationMultiplier(text);
    const res = await consumeCredits(userId, "narration", workspaceId, mult);
    return res.ok ? { ok: true, charge: { kind: "credits", mult } } : { ok: false, code: res.code, message: res.message ?? "クレジットが不足しています" };
  }
  if (isFreePlan(user.plan)) return { ok: false, code: FREE_PLAN_CODE, message: "ナレーションの作り直しはスタンダードプランでご利用いただけます。" };
  const chars = text.length;
  if (!(await useNarrationChars(userId, chars))) {
    const left = Math.max(0, STANDARD_LIMITS.narrationChars - user.narrationChars);
    return { ok: false, code: "NARRATION_LIMIT", message: `今月のナレーションの残りは ${left.toLocaleString()} 字です（今回 ${chars.toLocaleString()} 字）。` };
  }
  return { ok: true, charge: { kind: "chars", chars } };
}

export async function refundNarration(userId: string, c: NarrationCharge, workspaceId: string | null): Promise<void> {
  if (c.kind === "chars") await returnNarrationChars(userId, c.chars);
  else await refundCredits(userId, "narration", workspaceId, c.mult);
}
