-- ElevenLabs は未実装のため一時停止にして設定画面から隠す
INSERT INTO "model_configs" ("model_id", "model_type", "model_label", "availability", "updated_at") VALUES
  ('elevenlabs', 'tts', 'ElevenLabs', 'suspended', NOW())
ON CONFLICT ("model_id") DO NOTHING;

UPDATE "model_configs" SET "model_label" = 'Gemini 3.8 Flash TTS' WHERE "model_id" = 'gemini-tts-high';
