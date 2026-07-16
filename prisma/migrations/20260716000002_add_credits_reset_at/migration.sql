-- Add credits_reset_at to users for monthly credit reset tracking
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credits_reset_at" TIMESTAMPTZ;
