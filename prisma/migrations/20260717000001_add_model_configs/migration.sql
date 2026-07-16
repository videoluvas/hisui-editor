-- CreateTable
CREATE TABLE "model_configs" (
    "model_id"    TEXT NOT NULL,
    "model_type"  TEXT NOT NULL,
    "model_label" TEXT NOT NULL,
    "availability" TEXT NOT NULL DEFAULT 'paid',
    "updated_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "model_configs_pkey" PRIMARY KEY ("model_id")
);

-- Seed initial rows
INSERT INTO "model_configs" ("model_id", "model_type", "model_label", "availability", "updated_at") VALUES
  ('google-image-lite',    'image',  'Google Image Lite',  'free', NOW()),
  ('google-image-pro',     'image',  'Google Image Pro',   'paid', NOW()),
  ('seedream-5-0-pro',     'image',  'Seedream 5.0 Pro',   'paid', NOW()),
  ('reve-1',               'image',  'Reve AI',            'paid', NOW()),
  ('gpt-image-2-high',     'image',  'GPT Image 2 (High)', 'paid', NOW()),
  ('veo-3-lite',           'video',  'Veo 3 Lite',         'paid', NOW()),
  ('veo-3',                'video',  'Veo 3',              'paid', NOW()),
  ('gemini-tts-high',      'tts',    'Gemini TTS High',    'paid', NOW()),
  ('lyria-2',              'bgm',    'Lyria 2',            'paid', NOW()),
  ('lyria-3-pro-preview',  'bgm',    'Lyria 3 Pro',        'paid', NOW()),
  ('claude-haiku-4-5',     'script', 'Claude Haiku 4.5',   'free', NOW()),
  ('claude-sonnet-4-6',    'script', 'Claude Sonnet 4.6',  'paid', NOW()),
  ('claude-opus-4-7',      'script', 'Claude Opus 4.7',    'paid', NOW())
ON CONFLICT ("model_id") DO NOTHING;
