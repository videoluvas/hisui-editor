-- 取り込み失敗の種類（画面で対処方法を出し分ける）
ALTER TABLE "import_jobs" ADD COLUMN "error_code" TEXT;
