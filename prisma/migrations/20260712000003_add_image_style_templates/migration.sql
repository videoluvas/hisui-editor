-- CreateTable
CREATE TABLE "image_style_templates" (
    "id"               TEXT    NOT NULL,
    "template_key"     TEXT    NOT NULL,
    "name"             TEXT    NOT NULL,
    "description"      TEXT    NOT NULL,
    "style_prompt"     TEXT    NOT NULL,
    "sample_image_url" TEXT,
    "category"         TEXT    NOT NULL,
    "sort_order"       INTEGER NOT NULL DEFAULT 0,
    "is_active"        BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "image_style_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "image_style_templates_template_key_key" ON "image_style_templates"("template_key");
CREATE INDEX "image_style_templates_category_idx" ON "image_style_templates"("category");

-- Seed: existing style presets (no sample image)
INSERT INTO "image_style_templates" ("id","template_key","name","description","style_prompt","sample_image_url","category","sort_order") VALUES
  (gen_random_uuid(),'cinematic-dark',   'シネマティック',         '映画のような深みのある光と影',           'cinematic style, dramatic lighting, deep shadows, film-like quality, moody atmosphere',                                                                    NULL,'cinematic',  10),
  (gen_random_uuid(),'corporate-clean',  'ビジネス・クリーン',     '清潔感のあるプロフェッショナル',         'clean corporate style, bright and professional, minimal shadows, business-like, polished',                                                              NULL,'corporate',  20),
  (gen_random_uuid(),'natural-light',    'ナチュラルライト',       '自然光・温かみのある柔らかいトーン',     'natural lighting, soft warm tones, organic feel, gentle shadows, authentic atmosphere',                                                                NULL,'lifestyle',  30),
  (gen_random_uuid(),'minimal-white',    'ミニマル',               '余白を活かしたシンプルな構成',           'minimalist style, clean white background, simple composition, ample negative space, elegant',                                                          NULL,'artistic',   40),
  (gen_random_uuid(),'dark-luxury',      'ダーク・ラグジュアリー', '高級感のある洗練された暗いトーン',       'dark luxury style, sophisticated dark tones, premium feel, elegant shadows, high-end atmosphere',                                                      NULL,'cinematic',  50),
  (gen_random_uuid(),'vibrant-pop',      'ビビッド・ポップ',       '鮮やかで活気あふれる明るい色調',         'vibrant colors, energetic atmosphere, bold saturation, dynamic composition, lively',                                                                  NULL,'lifestyle',  60),
  (gen_random_uuid(),'documentary',      'ドキュメンタリー',       'リアルで臨場感のある記録スタイル',       'documentary style, realistic, authentic, candid moment, photojournalistic, raw',                                                                      NULL,'cinematic',  70),
  (gen_random_uuid(),'aerial-wide',      '空撮・俯瞰',             '上空から見た広大なスケール感',           'aerial perspective, bird''s eye view, expansive landscape, wide angle, drone photography style',                                                      NULL,'cinematic',  80),
  (gen_random_uuid(),'portrait-bokeh',   'ポートレート',           '人物の表情を引き立てるボケ感',           'portrait photography, shallow depth of field, bokeh background, expressive face, subject focus',                                                      NULL,'lifestyle',  90),
  (gen_random_uuid(),'futuristic-tech',  'フューチャリスティック', '近未来・テクノロジー感のあるデザイン',   'futuristic style, technology aesthetic, clean lines, digital atmosphere, sci-fi inspired, sleek',                                                      NULL,'corporate', 100),
  (gen_random_uuid(),'vintage-film',     'ヴィンテージ',           'レトロな質感・懐かしい色調',             'vintage style, film grain, warm aged tones, nostalgic atmosphere, retro aesthetic, faded',                                                            NULL,'artistic',  110),
  (gen_random_uuid(),'monochrome',       'モノクロ',               '白黒の力強いコントラスト',               'black and white photography, high contrast, monochrome, dramatic shadows, timeless',                                                                  NULL,'artistic',  120),
  (gen_random_uuid(),'golden-hour',      'ゴールデンアワー',       '夕暮れ・黄金色の柔らかい光',             'golden hour lighting, warm orange-gold tones, soft backlight, magical atmosphere, sunset',                                                            NULL,'lifestyle', 130),
  (gen_random_uuid(),'studio-product',   'スタジオ・プロダクト',   '商品・製品向けの明るいスタジオ撮影',     'studio lighting, product photography style, white seamless background, even illumination, commercial',                                                  NULL,'corporate', 140),
  (gen_random_uuid(),'neon-night',       'ネオン・夜景',           '夜の街・ネオンが輝く幻想的な雰囲気',     'neon lights, night scene, urban atmosphere, colorful reflections, nightlife, vivid glow',                                                            NULL,'artistic',  150),
  (gen_random_uuid(),'calm-blue',        'クール・ブルー',         '落ち着いた青みがかった冷静なトーン',     'cool blue tones, calm and composed atmosphere, professional, serene, trustworthy',                                                                    NULL,'corporate', 160)
ON CONFLICT DO NOTHING;

-- Seed: illustration / anime style templates (with sample images)
DO $$
DECLARE base TEXT := 'https://assets.hisui-ai.com/system/samples/step-02-image-generation/style-templates';
BEGIN
  INSERT INTO "image_style_templates" ("id","template_key","name","description","style_prompt","sample_image_url","category","sort_order") VALUES
    (gen_random_uuid(),'illust-line-mono',   'シンプル線画',           'モノクロスケッチ・クリーンな輪郭線',         'simple monochrome line art, clean sketch, black ink on white background, minimal shading, contour drawing, no color fill',                             base||'/style%20(1).png','illustration',210),
    (gen_random_uuid(),'illust-manga-line',  '感情強調線画',           '漫画寄りの表情豊かなイラスト',               'manga-style line art, expressive emotional illustration, dynamic linework, Japanese manga aesthetics, comic book style',                            base||'/style%20(2).png','illustration',220),
    (gen_random_uuid(),'illust-pencil',      '写実鉛筆スケッチ',       'リアルな鉛筆・グラファイトデッサン',         'realistic pencil sketch, detailed graphite illustration, fine crosshatching, textured paper, traditional art, hand-drawn',                         base||'/style%20(3).png','illustration',230),
    (gen_random_uuid(),'illust-warm-book',   '暖色絵本イラスト',       '温かみあるリアル系イラスト（絵本風）',       'warm-toned realistic illustration, picture book style, soft brush strokes, cozy atmosphere, storybook art, warm colors',                           base||'/style%20(4).png','illustration',240),
    (gen_random_uuid(),'illust-watercolor',  '淡色水彩',               'ふんわり優しいパステル水彩',                 'soft pastel watercolor painting, light airy color washes, dreamy gentle colors, delicate brushwork, transparent layers',                            base||'/style%20(5).png','illustration',250),
    (gen_random_uuid(),'illust-anime-bg',    'アニメ背景イラスト',     'カラフルで鮮やかなアニメ風背景',             'colorful anime background art, vibrant landscape illustration, detailed scenery, anime style environment, lush environment art',                  base||'/style%20(6).png','illustration',260),
    (gen_random_uuid(),'illust-anime-cel',   '現代アニメ（セルルック）','クリーンなセルシェーディングの現代アニメ', 'modern anime cel shading, bright vibrant colors, clean animation aesthetic, contemporary Japanese animation style',                               base||'/style%20(7).png','illustration',270),
    (gen_random_uuid(),'illust-anime-cinema','シネマ風アニメ',         '日常ドラマ的な映画クオリティのアニメ',       'cinematic anime style, slice-of-life drama atmosphere, realistic proportions, detailed everyday scene, animated film quality',                      base||'/style%20(8).png','illustration',280)
  ON CONFLICT DO NOTHING;
END $$;
