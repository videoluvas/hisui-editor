import { prisma } from "@/lib/prisma";

export type CreditType = "img" | "script" | "video" | "audio";

const CREDIT_LABELS: Record<CreditType, string> = {
  img:    "AI画像生成",
  script: "AI台本生成",
  video:  "AI動画生成",
  audio:  "AIナレーション生成",
};

const FREE_MODELS: Partial<Record<CreditType, string>> = {
  img:   "google-image-lite",
  video: "veo-3-lite",
};

type UserCredits = {
  plan: string | null;
  credit_img: number;
  credit_script: number;
  credit_video: number;
  credit_audio: number;
};

export async function checkFreeAccess(
  userId: string,
  type: CreditType,
  requestedModel: string,
): Promise<{ ok: boolean; message?: string; plan: string | null; effectiveModel: string }> {
  const rows = await prisma.$queryRaw<UserCredits[]>`
    SELECT plan, credit_img, credit_script, credit_video, credit_audio
    FROM users WHERE id = ${userId}::uuid
  `;
  const user = rows[0];

  if (!user) {
    return { ok: false, message: "ユーザーが見つかりません", plan: null, effectiveModel: requestedModel };
  }

  const isFree = !user.plan || user.plan === "Free";
  if (!isFree) {
    return { ok: true, plan: user.plan, effectiveModel: requestedModel };
  }

  const creditMap: Record<CreditType, number> = {
    img:    user.credit_img,
    script: user.credit_script,
    video:  user.credit_video,
    audio:  user.credit_audio,
  };

  if (creditMap[type] <= 0) {
    return {
      ok: false,
      message: `${CREDIT_LABELS[type]}の無料枠を使い切りました。プランをアップグレードしてください。`,
      plan: user.plan,
      effectiveModel: requestedModel,
    };
  }

  const effectiveModel = FREE_MODELS[type] ?? requestedModel;
  return { ok: true, plan: user.plan, effectiveModel };
}
