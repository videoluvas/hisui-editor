import { prisma } from "@/lib/prisma";

// ─── Action types ─────────────────────────────────────────────────────────────

export type CreditAction =
  | "scene_regen"             // コンテ1シーン再生成
  | "conte_generate"          // 台本→コンテ生成
  | "image_lite"              // AI画像生成（軽量）
  | "image_premium"           // AI画像生成（上位）
  | "image_gpt_high"          // AI画像生成・GPT Image 2 (high)
  | "image_gpt_1_5"           // AI画像生成・GPT Image 1.5 (high)
  | "video_lite"              // AI動画生成・Lite
  | "video_premium_no_audio"  // AI動画生成・上位（音声なし）
  | "video_premium_audio"     // AI動画生成・上位（音声あり）
  | "narration"               // AIナレーション（200文字単位）
  | "bgm_lyria2"              // AI BGM・Lyria 2
  | "bgm_lyria3pro"           // AI BGM・Lyria 3 Pro
  | "export_720p"             // 動画書き出し・720p（1分単位）
  | "export_1080p"            // 動画書き出し・1080p（1分単位）
  | "grant";                  // クレジット付与

export const CREDIT_COST: Record<CreditAction, number> = {
  scene_regen:            10,
  conte_generate:         50,
  image_lite:            100,
  image_premium:         400,
  image_gpt_high:      2_000,
  image_gpt_1_5:       1_500,
  video_lite:          1_000,
  video_premium_no_audio: 2_500,
  video_premium_audio:  5_000,
  narration:              10,   // × Math.ceil(chars/200)
  bgm_lyria2:             50,
  bgm_lyria3pro:         150,
  export_720p:           100,   // × Math.ceil(durationSec/60)
  export_1080p:          300,
  grant:                   0,
};

export const CREDIT_ACTION_LABEL: Record<CreditAction, string> = {
  scene_regen:            "シーン再生成",
  conte_generate:         "コンテ生成",
  image_lite:             "AI画像生成（軽量）",
  image_premium:          "AI画像生成（上位）",
  image_gpt_high:         "AI画像生成・GPT Image 2",
  image_gpt_1_5:          "AI画像生成・GPT Image 1.5",
  video_lite:             "AI動画生成・Lite",
  video_premium_no_audio: "AI動画生成・上位",
  video_premium_audio:    "AI動画生成・上位（音声あり）",
  narration:              "AIナレーション生成",
  bgm_lyria2:             "AI BGM生成",
  bgm_lyria3pro:          "AI BGM生成（Pro）",
  export_720p:            "動画書き出し（720p）",
  export_1080p:           "動画書き出し（1080p）",
  grant:                  "クレジット付与",
};

// ─── Model → action helpers ───────────────────────────────────────────────────

const IMAGE_LITE_MODELS     = new Set(["google-image-lite"]);
const IMAGE_GPT_HIGH_MODELS = new Set(["gpt-image-2-high"]);
const IMAGE_GPT_1_5_MODELS  = new Set(["gpt-image-1-5"]);

export function imageModelToAction(model: string): CreditAction {
  if (IMAGE_LITE_MODELS.has(model))     return "image_lite";
  if (IMAGE_GPT_HIGH_MODELS.has(model)) return "image_gpt_high";
  if (IMAGE_GPT_1_5_MODELS.has(model))  return "image_gpt_1_5";
  return "image_premium";
}

const VIDEO_LITE_MODELS = new Set(["veo-3-lite"]);

export function videoModelToAction(model: string, generateAudio: boolean): CreditAction {
  if (VIDEO_LITE_MODELS.has(model)) return "video_lite";
  return generateAudio ? "video_premium_audio" : "video_premium_no_audio";
}

export function bgmModelToAction(model: string): CreditAction {
  return model === "lyria-2" ? "bgm_lyria2" : "bgm_lyria3pro";
}

export function narrationMultiplier(text: string): number {
  return Math.max(1, Math.ceil(text.length / 200));
}

export function exportAction(resolution: string): CreditAction {
  if (resolution === "720p") return "export_720p";
  return "export_1080p";
}

export function exportMultiplier(durationSec: number): number {
  return Math.max(1, Math.ceil(durationSec / 60));
}

// ─── Core functions ───────────────────────────────────────────────────────────

export async function consumeCredits(
  userId: string,
  action: CreditAction,
  workspaceId?: string | null,
  multiplier: number = 1,
): Promise<{ ok: boolean; message?: string; creditsRemaining?: number }> {
  const cost = CREDIT_COST[action] * multiplier;
  if (cost === 0) return { ok: true };

  try {
    const newBalance = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ credits: number }>>`
        SELECT credits FROM users WHERE id = ${userId}::uuid FOR UPDATE
      `;
      if (!rows[0]) throw new Error("USER_NOT_FOUND");

      const current = rows[0].credits;
      if (current < cost) throw new Error(`INSUFFICIENT:${current}:${cost}`);

      const balance = current - cost;
      await tx.$executeRaw`UPDATE users SET credits = ${balance} WHERE id = ${userId}::uuid`;
      await tx.logCredit.create({
        data: {
          userId,
          workspaceId: workspaceId ?? null,
          creditType: action,
          delta: -cost,
          balanceAfter: balance,
          reason: action,
        },
      });
      return balance;
    });
    return { ok: true, creditsRemaining: newBalance };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.startsWith("INSUFFICIENT:")) {
      const [, current, required] = msg.split(":");
      return {
        ok: false,
        message: `クレジットが不足しています（残り${current}クレジット、必要${required}クレジット）。ダッシュボードでご確認ください。`,
      };
    }
    if (msg === "USER_NOT_FOUND") return { ok: false, message: "ユーザーが見つかりません" };
    throw e;
  }
}

export async function refundCredits(
  userId: string,
  action: CreditAction,
  workspaceId?: string | null,
  multiplier: number = 1,
): Promise<void> {
  const cost = CREDIT_COST[action] * multiplier;
  if (cost === 0) return;
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE users SET credits = credits + ${cost} WHERE id = ${userId}::uuid`;
      const rows = await tx.$queryRaw<Array<{ credits: number }>>`
        SELECT credits FROM users WHERE id = ${userId}::uuid
      `;
      await tx.logCredit.create({
        data: {
          userId,
          workspaceId: workspaceId ?? null,
          creditType: action,
          delta: cost,
          balanceAfter: rows[0]?.credits ?? 0,
          reason: "refund_error",
        },
      });
    });
  } catch (e) {
    console.error("[refundCredits] failed", { userId, action, multiplier, error: e });
  }
}

export async function grantCredits(
  userId: string,
  amount: number,
  reason: string = "manual_grant",
): Promise<{ ok: boolean; creditsRemaining?: number }> {
  try {
    await prisma.$executeRaw`UPDATE users SET credits = credits + ${amount} WHERE id = ${userId}::uuid`;
    const rows = await prisma.$queryRaw<Array<{ credits: number }>>`
      SELECT credits FROM users WHERE id = ${userId}::uuid
    `;
    const balance = rows[0]?.credits ?? 0;
    prisma.logCredit.create({
      data: { userId, creditType: "grant", delta: amount, balanceAfter: balance, reason },
    }).catch(() => {});
    return { ok: true, creditsRemaining: balance };
  } catch {
    return { ok: false };
  }
}

const PLAN_DEFAULT_CREDITS: Record<string, number> = {
  Free:     1_000,
  Pro:    500_000,
  Business: 150_000,
};

export function planDefaultCredits(plan: string | null): number {
  return PLAN_DEFAULT_CREDITS[plan ?? "Free"] ?? 1_000;
}
