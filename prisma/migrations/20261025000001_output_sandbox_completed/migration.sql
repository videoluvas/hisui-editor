-- 書き出し履歴：どちらの書き出しサーバーで作ったか（戻ってきたときに状態を確認するため）と完了時刻（URLの有効期限の計算に使う）
ALTER TABLE "logs_output" ADD COLUMN "sandbox" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "logs_output" ADD COLUMN "completed_at" TIMESTAMP(3);
