-- CreateTable
CREATE TABLE "voice_samples" (
    "id"         TEXT NOT NULL,
    "provider"   TEXT NOT NULL,
    "model_key"  TEXT NOT NULL,
    "no"         INTEGER NOT NULL,
    "name"       TEXT NOT NULL,
    "gender"     TEXT NOT NULL,
    "trait"      TEXT NOT NULL,
    "sample_url" TEXT NOT NULL,

    CONSTRAINT "voice_samples_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voice_samples_provider_model_key_name_key" ON "voice_samples"("provider", "model_key", "name");
CREATE INDEX "voice_samples_provider_model_key_idx" ON "voice_samples"("provider", "model_key");

-- Seed: Gemini 3.1 Flash TTS voices
DO $$
DECLARE base TEXT := 'https://assets.hisui-ai.com/system/samples/step-04-narration/gemini-3.1-flash-tts';
BEGIN
  INSERT INTO "voice_samples" ("id","provider","model_key","no","name","gender","trait","sample_url") VALUES
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 1,'Zephyr',       '女性','明るい',           base||'/01_Zephyr.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 2,'Puck',         '男性','明るく快活',       base||'/02_Puck.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 3,'Charon',       '男性','説明的',           base||'/03_Charon.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 4,'Kore',         '女性','しっかりした',     base||'/04_Kore.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 5,'Fenrir',       '男性','感情豊かで活発',   base||'/05_Fenrir.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 6,'Leda',         '女性','若々しい',         base||'/06_Leda.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 7,'Orus',         '男性','しっかりした',     base||'/07_Orus.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 8,'Aoede',        '女性','軽やかで爽やか',   base||'/08_Aoede.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high', 9,'Callirrhoe',   '女性','おおらかで自然体', base||'/09_Callirrhoe.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',10,'Autonoe',      '女性','明るい',           base||'/10_Autonoe.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',11,'Enceladus',    '男性','息遣いを含んだ',   base||'/11_Enceladus.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',12,'Iapetus',      '男性','明瞭',             base||'/12_Iapetus.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',13,'Umbriel',      '男性','おおらかで自然体', base||'/13_Umbriel.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',14,'Algieba',      '男性','なめらか',         base||'/14_Algieba.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',15,'Despina',      '女性','なめらか',         base||'/15_Despina.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',16,'Erinome',      '女性','明瞭',             base||'/16_Erinome.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',17,'Algenib',      '男性','しゃがれた',       base||'/17_Algenib.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',18,'Rasalgethi',   '男性','説明的',           base||'/18_Rasalgethi.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',19,'Laomedeia',    '女性','明るく快活',       base||'/19_Laomedeia.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',20,'Achernar',     '女性','柔らかい',         base||'/20_Achernar.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',21,'Alnilam',      '男性','しっかりした',     base||'/21_Alnilam.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',22,'Schedar',      '男性','均一で安定した',   base||'/22_Schedar.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',23,'Gacrux',       '女性','成熟した',         base||'/23_Gacrux.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',24,'Pulcherrima',  '女性','前に出る積極的な', base||'/24_Pulcherrima.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',25,'Achird',       '男性','親しみやすい',     base||'/25_Achird.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',26,'Zubenelgenubi','男性','カジュアル',       base||'/26_Zubenelgenubi.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',27,'Vindemiatrix', '女性','優しい',           base||'/27_Vindemiatrix.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',28,'Sadachbia',    '男性','活気のある',       base||'/28_Sadachbia.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',29,'Sadaltager',   '男性','知的で博識な',     base||'/29_Sadaltager.wav'),
    (gen_random_uuid(),'google-gemini','gemini-tts-high',30,'Sulafat',      '女性','温かみのある',     base||'/30_Sulafat.wav')
  ON CONFLICT DO NOTHING;
END $$;
