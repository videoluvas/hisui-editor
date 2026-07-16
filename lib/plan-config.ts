import { prisma } from "@/lib/prisma";
import type { PlanConfigRow } from "@/lib/email";

const DEFAULTS = [
  { id: "Free",     label: "無料プラン",     price_jpy: 0,     credits_default: 1_000,   credit_img_max: 15,  credit_script_max: 5,   credit_video_max: 10, credit_audio_max: 20,  credit_bgm_max: 5,  free_model_img: "google-image-lite", free_model_video: "veo-3-lite", max_workspaces: 3  },
  { id: "Business", label: "Businessプラン", price_jpy: 4800,  credits_default: 150_000, credit_img_max: 100, credit_script_max: 50,  credit_video_max: 30, credit_audio_max: 50,  credit_bgm_max: 10, free_model_img: "google-image-pro",  free_model_video: "veo-3",      max_workspaces: 10 },
  { id: "Pro",      label: "Proプラン",      price_jpy: 9800,  credits_default: 500_000, credit_img_max: 200, credit_script_max: 100, credit_video_max: 50, credit_audio_max: 100, credit_bgm_max: 20, free_model_img: "google-image-pro",  free_model_video: "veo-3",      max_workspaces: 20 },
];

export async function ensurePlanConfigsTable(): Promise<void> {
  await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS plan_configs (
      id                 TEXT        PRIMARY KEY,
      label              TEXT        NOT NULL DEFAULT '',
      price_jpy          INT         NOT NULL DEFAULT 0,
      credits_default    INT         NOT NULL DEFAULT 1000,
      credit_img_max     INT         NOT NULL DEFAULT 15,
      credit_script_max  INT         NOT NULL DEFAULT 5,
      credit_video_max   INT         NOT NULL DEFAULT 10,
      credit_audio_max   INT         NOT NULL DEFAULT 20,
      credit_bgm_max     INT         NOT NULL DEFAULT 5,
      free_model_img     TEXT        NOT NULL DEFAULT 'google-image-lite',
      free_model_video   TEXT        NOT NULL DEFAULT 'veo-3-lite',
      max_workspaces     INT         NOT NULL DEFAULT 3,
      updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // credits_default カラムが既存テーブルにない場合は追加
  await prisma.$executeRaw`
    ALTER TABLE plan_configs ADD COLUMN IF NOT EXISTS credits_default INT NOT NULL DEFAULT 1000
  `;
  for (const d of DEFAULTS) {
    await prisma.$executeRaw`
      INSERT INTO plan_configs
        (id, label, price_jpy, credits_default, credit_img_max, credit_script_max, credit_video_max, credit_audio_max, credit_bgm_max, free_model_img, free_model_video, max_workspaces)
      VALUES
        (${d.id}, ${d.label}, ${d.price_jpy}, ${d.credits_default}, ${d.credit_img_max}, ${d.credit_script_max}, ${d.credit_video_max}, ${d.credit_audio_max}, ${d.credit_bgm_max}, ${d.free_model_img}, ${d.free_model_video}, ${d.max_workspaces})
      ON CONFLICT (id) DO NOTHING
    `;
  }
}

export async function getPlanConfig(planId: string): Promise<PlanConfigRow | null> {
  try {
    const rows = await prisma.$queryRaw<PlanConfigRow[]>`
      SELECT * FROM plan_configs WHERE id = ${planId} LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function getPlanCreditsDefault(planId: string): Promise<number> {
  const FALLBACK: Record<string, number> = { Free: 1_000, Business: 150_000, Pro: 500_000 };
  try {
    const rows = await prisma.$queryRaw<{ credits_default: number }[]>`
      SELECT credits_default FROM plan_configs WHERE id = ${planId} LIMIT 1
    `;
    return rows[0]?.credits_default ?? FALLBACK[planId] ?? 1_000;
  } catch {
    return FALLBACK[planId] ?? 1_000;
  }
}
