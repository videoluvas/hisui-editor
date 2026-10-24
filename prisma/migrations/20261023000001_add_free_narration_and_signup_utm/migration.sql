-- AlterTable
ALTER TABLE "users" ADD COLUMN "free_narration_imports" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "signup_utm" JSONB;
