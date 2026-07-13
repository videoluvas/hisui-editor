-- ============================================================
-- User テーブル拡張
-- 既存カラム: id, bubble_user_id, name, plan, icon_url, created_at, updated_at
-- ============================================================

-- bubble_user_id を nullable に変更
ALTER TABLE "users" ALTER COLUMN "bubble_user_id" DROP NOT NULL;

-- プロフィール（新規追加）
ALTER TABLE "users"
  ADD COLUMN "email"        TEXT,
  ADD COLUMN "surname"      TEXT,
  ADD COLUMN "phone"        TEXT,
  ADD COLUMN "company_name" TEXT,
  ADD COLUMN "slug"         TEXT;

-- プラン・フラグ（新規追加。plan/name/icon_url は既存のため除外）
ALTER TABLE "users"
  ADD COLUMN "customer_id"       TEXT NOT NULL DEFAULT 'Demo',
  ADD COLUMN "is_demo"           BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "invite_code"       TEXT,
  ADD COLUMN "new_signup_bonus"  BOOLEAN NOT NULL DEFAULT false;

-- クレジット
ALTER TABLE "users"
  ADD COLUMN "credit_img"        INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "credit_img_max"    INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN "credit_script"     INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN "credit_script_max" INTEGER NOT NULL DEFAULT 5;

-- Stripe
ALTER TABLE "users"
  ADD COLUMN "stripe_customer_id"          TEXT,
  ADD COLUMN "stripe_plan_id"              TEXT,
  ADD COLUMN "stripe_subscription_id"      TEXT,
  ADD COLUMN "stripe_subscription_status"  TEXT,
  ADD COLUMN "stripe_period_start"         TIMESTAMP(3),
  ADD COLUMN "stripe_period_end"           TIMESTAMP(3);

-- Storyboard
ALTER TABLE "users"
  ADD COLUMN "storyboard_last_open_at" TIMESTAMP(3),
  ADD COLUMN "storyboard_main_id"      TEXT;

-- Unique 制約
CREATE UNIQUE INDEX "users_email_key"                   ON "users"("email");
CREATE UNIQUE INDEX "users_slug_key"                    ON "users"("slug");
CREATE UNIQUE INDEX "users_stripe_customer_id_key"      ON "users"("stripe_customer_id");
CREATE UNIQUE INDEX "users_stripe_subscription_id_key"  ON "users"("stripe_subscription_id");

-- ============================================================
-- ログテーブル
-- ============================================================

CREATE TABLE "logs_checkout" (
  "id"                TEXT NOT NULL,
  "user_id"           TEXT NOT NULL,
  "stripe_session_id" TEXT,
  "stripe_price_id"   TEXT,
  "amount"            INTEGER,
  "currency"          TEXT DEFAULT 'jpy',
  "status"            TEXT NOT NULL DEFAULT 'pending',
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logs_checkout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logs_credit" (
  "id"            TEXT NOT NULL,
  "user_id"       TEXT NOT NULL,
  "credit_type"   TEXT NOT NULL,
  "delta"         INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "reason"        TEXT,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logs_credit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logs_notification" (
  "id"         TEXT NOT NULL,
  "user_id"    TEXT NOT NULL,
  "type"       TEXT,
  "title"      TEXT,
  "body"       TEXT,
  "read_at"    TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logs_notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "logs_output" (
  "id"           TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "project_id"   TEXT,
  "render_id"    TEXT,
  "status"       TEXT NOT NULL DEFAULT 'pending',
  "output_url"   TEXT,
  "duration_sec" INTEGER,
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "logs_output_pkey" PRIMARY KEY ("id")
);

-- インデックス
CREATE INDEX "logs_checkout_user_id_idx"             ON "logs_checkout"("user_id");
CREATE INDEX "logs_credit_user_id_credit_type_idx"   ON "logs_credit"("user_id", "credit_type");
CREATE INDEX "logs_notification_user_id_read_at_idx" ON "logs_notification"("user_id", "read_at");
CREATE INDEX "logs_output_user_id_idx"               ON "logs_output"("user_id");
CREATE INDEX "logs_output_project_id_idx"            ON "logs_output"("project_id");

-- 外部キー
ALTER TABLE "logs_checkout"     ADD CONSTRAINT "logs_checkout_user_id_fkey"      FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logs_credit"       ADD CONSTRAINT "logs_credit_user_id_fkey"        FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logs_notification" ADD CONSTRAINT "logs_notification_user_id_fkey"  FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logs_output"       ADD CONSTRAINT "logs_output_user_id_fkey"        FOREIGN KEY ("user_id")    REFERENCES "users"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "logs_output"       ADD CONSTRAINT "logs_output_project_id_fkey"     FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;
