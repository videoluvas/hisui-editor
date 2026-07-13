-- ============================================================
-- storyboard_main
-- ============================================================

CREATE TABLE "storyboard_main" (
  "id"               TEXT NOT NULL,
  "user_id"          TEXT NOT NULL,
  "project_id"       TEXT,
  "slug"             TEXT,

  "title"            TEXT,
  "original_script"  TEXT,
  "duration"         TEXT,
  "prompt"           TEXT,
  "speed"            TEXT,
  "status"           TEXT NOT NULL DEFAULT 'draft',

  "ai_script_log"    TEXT,
  "ai_script_log_ex" TEXT,

  "log"              TEXT,
  "test_json"        TEXT,
  "test_list"        TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "test_no"          INTEGER,

  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "storyboard_main_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storyboard_main_slug_key" ON "storyboard_main"("slug");
CREATE INDEX "storyboard_main_user_id_idx"    ON "storyboard_main"("user_id");
CREATE INDEX "storyboard_main_project_id_idx" ON "storyboard_main"("project_id");

ALTER TABLE "storyboard_main"
  ADD CONSTRAINT "storyboard_main_user_id_fkey"
    FOREIGN KEY ("user_id")   REFERENCES "users"("id")    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "storyboard_main"
  ADD CONSTRAINT "storyboard_main_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- storyboard_scene
-- ============================================================

CREATE TABLE "storyboard_scene" (
  "id"      TEXT NOT NULL,
  "main_id" TEXT NOT NULL,
  "slug"    TEXT,

  -- 基本情報
  "scene_no"          INTEGER,
  "title"             TEXT,
  "duration"          TEXT,
  "source_text_chunk" TEXT,
  "na_text"           TEXT,

  -- 画像生成
  "img_error"           TEXT,
  "img_error_yn"        BOOLEAN NOT NULL DEFAULT false,
  "img_prompt"          TEXT,
  "img_prompt_angle"    TEXT,
  "img_prompt_content"  TEXT,
  "img_status_yn"       BOOLEAN NOT NULL DEFAULT false,
  "img_style"           TEXT    NOT NULL DEFAULT 'photo',
  "img_style_illust"    TEXT,
  "img_style_unified_id" TEXT,
  "img_url"             TEXT,
  "img_url_dl"          TEXT,

  -- 動画生成
  "video_error"           TEXT,
  "video_error_yn"        BOOLEAN NOT NULL DEFAULT false,
  "video_id"              TEXT,
  "video_prompt"          TEXT,
  "video_camera_fixed"    BOOLEAN NOT NULL DEFAULT false,
  "video_duration"        DECIMAL(6,2),
  "video_generate_audio"  BOOLEAN NOT NULL DEFAULT false,
  "video_start_time"      TIMESTAMP(3),
  "video_status"          TEXT    NOT NULL DEFAULT 'ready',
  "video_status_yn"       BOOLEAN NOT NULL DEFAULT false,
  "video_text"            TEXT,
  "video_url"             TEXT,

  -- 音声生成
  "audio_text"     TEXT,
  "audio_url"      TEXT,
  "audio_settings" JSONB,

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "storyboard_scene_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "storyboard_scene_slug_key"         ON "storyboard_scene"("slug");
CREATE INDEX "storyboard_scene_main_id_scene_no_idx"    ON "storyboard_scene"("main_id", "scene_no");

ALTER TABLE "storyboard_scene"
  ADD CONSTRAINT "storyboard_scene_main_id_fkey"
    FOREIGN KEY ("main_id") REFERENCES "storyboard_main"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "storyboard_scene"
  ADD CONSTRAINT "storyboard_scene_img_style_unified_id_fkey"
    FOREIGN KEY ("img_style_unified_id") REFERENCES "storyboard_scene"("id") ON DELETE SET NULL ON UPDATE CASCADE;
