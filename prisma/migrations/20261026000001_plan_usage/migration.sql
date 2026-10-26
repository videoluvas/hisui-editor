-- スタンダードプラン：今月（credits_reset_at から）ノートのナレーションに使った文字数。月の更新で 0 に戻す
ALTER TABLE "users" ADD COLUMN "narration_chars" INTEGER NOT NULL DEFAULT 0;

-- 料金改定：スタンダード 9,800円（税抜）・AI クレジットなし、Pro は法人プラン（お見積り）
-- plan_configs は lib/plan-config.ts の ensurePlanConfigsTable が作るため、ない環境では何もしない
DO $$
BEGIN
  IF to_regclass('public.plan_configs') IS NOT NULL THEN
    UPDATE plan_configs SET label = 'スタンダードプラン', price_jpy = 9800, credits_default = 0, updated_at = NOW() WHERE id = 'Business';
    UPDATE plan_configs SET label = '法人プラン', price_jpy = 0, updated_at = NOW() WHERE id = 'Pro';
  END IF;
END $$;
