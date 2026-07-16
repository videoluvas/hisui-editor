export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import zlib from "zlib";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { resolveSeedreamSize } from "@/lib/imageSettings";
import { consumeCredits, refundCredits, imageModelToAction } from "@/lib/credits";

const REVE_API_URL   = "https://api.reve.com/v1/image/edit";
const ARK_API_URL    = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const OPENAI_IMG_URL = "https://api.openai.com/v1/images/generations";

function buildBlankPng(w = 16, h = 9): Buffer {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = (t[(c ^ b) & 0xff] ^ (c >>> 8)) >>> 0;
    return (c ^ 0xffffffff) >>> 0;
  };
  const concat = (bufs: Buffer[]): Buffer => Buffer.concat(bufs as unknown as Uint8Array[]);
  const chunk = (type: string, data: Buffer) => {
    const lenB = Buffer.allocUnsafe(4); lenB.writeUInt32BE(data.length);
    const typeB = Buffer.from(type, "ascii");
    const crcB = Buffer.allocUnsafe(4); crcB.writeUInt32BE(crc32(concat([typeB, data])));
    return concat([lenB, typeB, data, crcB]);
  };
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const row = Buffer.allocUnsafe(1 + w * 3); row[0] = 0; row.fill(255, 1);
  const raw = concat(Array.from({ length: h }, () => row));
  return concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw as unknown as Uint8Array, { level: 1 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    prompt?: string;
    imageModel?: string;
    workspaceId?: string;
    // Reve AI
    aspectRatio?: string;
    version?: string;
    testTimeScaling?: number;
    upscaleFactor?: number;
    removeBg?: boolean;
    fitImageMaxDim?: number;
    // Seedream
    sdAspectRatio?: string;
    sdResolution?: string;
    sdOutputFormat?: string;
    sdWatermark?: boolean;
    sdOptimizePrompt?: boolean;
    // Google
    googleAspectRatio?: string;
    googleQualityHint?: string;
    // GPT Image 2
    gptSize?: string;
    gptOutputFormat?: string;
    // ワークスペース設定
    imgCommonRules?: string;
    imgNegativePrompt?: string;
  };

  const basePrompt = (body.prompt ?? "").trim();
  if (!basePrompt) return NextResponse.json({ ok: false, message: "プロンプトを入力してください" }, { status: 400 });

  // ワークスペースの共通ルール・ネガティブプロンプトを結合
  const rules = body.imgCommonRules?.trim();
  const neg   = body.imgNegativePrompt?.trim();
  const prompt = [basePrompt, rules, neg ? `以下の要素は含めないでください: ${neg}` : ""].filter(Boolean).join(" ");

  const imageModel = body.imageModel ?? "google-image-lite";
  const userId = session.userId;
  const workspaceId = body.workspaceId ?? null;
  const credit = await consumeCredits(userId, imageModelToAction(imageModel), workspaceId);
  if (!credit.ok) return NextResponse.json({ ok: false, message: credit.message }, { status: 402 });

  // ── Seedream 5.0 Pro ─────────────────────────────────────────────────────────
  if (imageModel === "seedream-5-0-pro") {
    const arkApiKey = process.env.ARK_API_KEY;
    if (!arkApiKey) return NextResponse.json({ ok: false, message: "ARK_API_KEY が設定されていません" }, { status: 500 });
    const arkModel = process.env.IMAGE_GEN_MODEL;
    if (!arkModel) return NextResponse.json({ ok: false, message: "IMAGE_GEN_MODEL が設定されていません" }, { status: 500 });

    const { sdAspectRatio = "16:9", sdResolution = "1K", sdOutputFormat = "jpeg", sdWatermark = false, sdOptimizePrompt = false } = body;
    const size = resolveSeedreamSize(sdResolution as "1K" | "2K", sdAspectRatio);
    const ext = sdOutputFormat === "png" ? "png" : "jpg";
    const contentType = sdOutputFormat === "png" ? "image/png" : "image/jpeg";

    const arkBody: Record<string, unknown> = {
      model: arkModel, prompt, size,
      output_format: sdOutputFormat, watermark: sdWatermark, response_format: "b64_json",
    };
    if (sdOptimizePrompt) arkBody.optimize_prompt_options = { mode: "standard" };

    let imageB64: string;
    try {
      const resp = await fetch(ARK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${arkApiKey}` },
        body: JSON.stringify(arkBody),
      });
      if (!resp.ok) throw new Error(`ARK ${resp.status}: ${await resp.text()}`);
      const data = await resp.json() as { data?: Array<{ b64_json?: string }>; error?: { message: string } };
      if (data.error) throw new Error(data.error.message);
      if (!data.data?.[0]?.b64_json) throw new Error("画像データが返されませんでした");
      imageB64 = data.data[0].b64_json;
    } catch (e) {
      await logError("editor-generate-image", `ARK API error: ${e}`, { userId, detail: {} });
      await refundCredits(userId, imageModelToAction(imageModel), workspaceId);
      return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
    }

    const imgBuffer = Buffer.from(imageB64, "base64");
    const key = `user/${userId}/editor/images/${Date.now()}.${ext}`;
    await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: imgBuffer, ContentType: contentType }));
    const url = `${R2_PUBLIC_URL}/${key}`;
    await prisma.file.create({ data: { userId, workspaceId, storageKey: key, fileUrl: url, fileName: key.split("/").pop() ?? "image", fileType: "image", mimeType: contentType, sizeBytes: BigInt(imgBuffer.length) } }).catch(() => {});
    return NextResponse.json({ ok: true, url });
  }

  // ── GPT Image 2 (high) ───────────────────────────────────────────────────────
  if (imageModel === "gpt-image-2-high") {
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) return NextResponse.json({ ok: false, message: "OPENAI_API_KEY が設定されていません" }, { status: 500 });

    const { gptSize = "1536x1024", gptOutputFormat = "png" } = body;
    const ext = gptOutputFormat === "jpeg" ? "jpg" : gptOutputFormat;
    const contentType = gptOutputFormat === "jpeg" ? "image/jpeg" : gptOutputFormat === "webp" ? "image/webp" : "image/png";

    let imageB64: string;
    try {
      const resp = await fetch(OPENAI_IMG_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiApiKey}` },
        body: JSON.stringify({ model: "gpt-image-1", prompt, size: gptSize, quality: "high", output_format: gptOutputFormat, response_format: "b64_json", n: 1 }),
      });
      if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
      const data = await resp.json() as { data?: Array<{ b64_json?: string }>; error?: { message: string } };
      if (data.error) throw new Error((data.error as { message: string }).message);
      if (!data.data?.[0]?.b64_json) throw new Error("画像データが返されませんでした");
      imageB64 = data.data[0].b64_json;
    } catch (e) {
      await logError("editor-generate-image", `OpenAI API error: ${e}`, { userId, detail: {} });
      await refundCredits(userId, imageModelToAction(imageModel), workspaceId);
      return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
    }

    const imgBuffer = Buffer.from(imageB64, "base64");
    const key = `user/${userId}/editor/images/${Date.now()}.${ext}`;
    await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: imgBuffer, ContentType: contentType }));
    const url = `${R2_PUBLIC_URL}/${key}`;
    await prisma.file.create({ data: { userId, workspaceId, storageKey: key, fileUrl: url, fileName: key.split("/").pop() ?? "image", fileType: "image", mimeType: contentType, sizeBytes: BigInt(imgBuffer.length) } }).catch(() => {});
    return NextResponse.json({ ok: true, url });
  }

  // ── Google Gemini 画像生成 ────────────────────────────────────────────────────
  if (imageModel === "google-image-lite" || imageModel === "google-image-pro") {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    const googleModelId = imageModel === "google-image-lite" ? "gemini-3.1-flash-lite-image" : "gemini-3-pro-image";
    const { googleAspectRatio = "16:9" } = body;
    const arHint = googleAspectRatio && googleAspectRatio !== "auto" ? ` 横縦比は${googleAspectRatio}で出力してください。` : "";
    const fullPrompt = prompt + arHint;

    const googleBody = {
      contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      generationConfig: { responseModalities: ["IMAGE"] },
    };

    let imageB64: string;
    let mimeType = "image/jpeg";
    try {
      const resp = await fetch(`${GOOGLE_AI_BASE}/models/${googleModelId}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": googleApiKey },
        body: JSON.stringify(googleBody),
      });
      if (!resp.ok) throw new Error(`Google ${resp.status}: ${await resp.text()}`);
      const data = await resp.json() as {
        candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType: string } }> } }>;
        error?: { message: string };
      };
      if (data.error) throw new Error(data.error.message);
      const inlineData = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
      if (!inlineData?.data) throw new Error("画像データが返されませんでした");
      imageB64 = inlineData.data;
      mimeType = inlineData.mimeType ?? "image/jpeg";
    } catch (e) {
      await logError("editor-generate-image", `Google API error: ${e}`, { userId, detail: {} });
      await refundCredits(userId, imageModelToAction(imageModel), workspaceId);
      return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
    }

    const ext = mimeType === "image/png" ? "png" : "jpg";
    const imgBuffer = Buffer.from(imageB64, "base64");
    const key = `user/${userId}/editor/images/${Date.now()}.${ext}`;
    await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: imgBuffer, ContentType: mimeType }));
    const url = `${R2_PUBLIC_URL}/${key}`;
    await prisma.file.create({ data: { userId, workspaceId, storageKey: key, fileUrl: url, fileName: key.split("/").pop() ?? "image", fileType: "image", mimeType, sizeBytes: BigInt(imgBuffer.length) } }).catch(() => {});
    return NextResponse.json({ ok: true, url });
  }

  // ── Reve AI ─────────────────────────────────────────────────────────────────
  const apiKey = process.env.REVE_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, message: "REVE_API_KEY が設定されていません" }, { status: 500 });

  const { aspectRatio = "16:9", version = "latest", testTimeScaling = 1, upscaleFactor = 0, removeBg = false, fitImageMaxDim = 0 } = body;
  const postprocessing: Array<Record<string, unknown>> = [];
  if (upscaleFactor >= 2) postprocessing.push({ process: "upscale", upscale_factor: upscaleFactor });
  if (removeBg) postprocessing.push({ process: "remove_background" });
  if (fitImageMaxDim > 0) postprocessing.push({ process: "fit_image", max_dim: fitImageMaxDim });

  const reveBody: Record<string, unknown> = {
    edit_instruction: prompt,
    reference_image: buildBlankPng(16, 9).toString("base64"),
    aspect_ratio: aspectRatio,
    version,
    test_time_scaling: Math.max(1, Math.min(15, Number(testTimeScaling) || 1)),
  };
  if (postprocessing.length > 0) reveBody.postprocessing = postprocessing;

  let imageB64: string;
  try {
    const resp = await fetch(REVE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify(reveBody),
    });
    if (!resp.ok) throw new Error(`Reve ${resp.status}: ${await resp.text()}`);
    const data = await resp.json() as { image?: string; message?: string };
    if (!data.image) throw new Error(data.message ?? "画像データが返されませんでした");
    imageB64 = data.image;
  } catch (e) {
    await logError("editor-generate-image", `Reve API error: ${e}`, { userId, detail: {} });
    await refundCredits(userId, imageModelToAction(imageModel), workspaceId);
    return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
  }

  const imgBuffer = Buffer.from(imageB64, "base64");
  const key = `user/${userId}/editor/images/${Date.now()}.png`;
  await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: imgBuffer, ContentType: "image/png" }));
  const url = `${R2_PUBLIC_URL}/${key}`;
  await prisma.file.create({ data: { userId, workspaceId, storageKey: key, fileUrl: url, fileName: key.split("/").pop() ?? "image.png", fileType: "image", mimeType: "image/png", sizeBytes: BigInt(imgBuffer.length) } }).catch(() => {});
  return NextResponse.json({ ok: true, url });
}
