export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import zlib from "zlib";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { resolveSeedreamSize } from "@/lib/imageSettings";

const REVE_API_URL   = "https://api.reve.com/v1/image/edit";
const ARK_API_URL    = "https://ark.ap-southeast.bytepluses.com/api/v3/images/generations";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ── 白紙PNG生成 ──────────────────────────────────────────────────────────────

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

// ── スタイル別 edit_instruction 構築（Reve用） ───────────────────────────────

function buildEditInstruction(style: string, sceneContent: string, composition: string, commonRules?: string, negativePrompt?: string): string {
  const content  = [sceneContent.trim(), composition.trim()].filter(Boolean).join("。");
  const rules    = commonRules?.trim() ?? "";
  const negHint  = negativePrompt?.trim() ? `以下の要素は含めないでください: ${negativePrompt.trim()}。` : "";
  switch (style) {
    case "photo":
      return [
        content,
        "プロンプト内容を最も適切に表現できるシーンを設計し、実写もしくはCGグラフィックなど最適な表現手段を選択して描写してください。",
        "イラスト調・アニメ調・手描き風の表現は使用しないでください。",
        rules, negHint,
      ].filter(Boolean).join(" ");
    case "illustration":
      return [
        content,
        "参考画像のスタイル・描画タッチを踏まえ、イラストスタイルで描いてください。",
        "参考画像から「描画タッチ」のみを抽出し、構図・被写体・内容はプロンプトに従ってください。",
        rules, negHint,
      ].filter(Boolean).join(" ");
    case "unified":
      return [
        content,
        "参考画像と同じ動画内の別シーンとして、スタイル・世界観・映像トーンを統一して描いてください。",
        "登場人物の外見・特徴・服装は統一してください。",
        "カメラの位置・アングル・構図は必ず変えてください。",
        rules, negHint,
      ].filter(Boolean).join(" ");
    default:
      return [content, rules, negHint].filter(Boolean).join(" ");
  }
}

// ── Google Gemini 用プロンプト構築 ────────────────────────────────────────────

const QUALITY_HINT_MAP: Record<string, string> = {
  detail:     "超高精細・シャープフォーカス・細部まで精密に描写してください。",
  cinematic:  "シネマティックな映像表現・ドラマチックな照明・映画のワンシーンのように描写してください。",
  commercial: "商業広告向けのクリーンなビジュアル・プロフェッショナルな仕上がりで描写してください。",
};

function buildGoogleImagePrompt(
  style: string,
  sceneContent: string,
  composition: string,
  aspectRatio?: string,
  negativePrompt?: string,
  qualityHint?: string,
  commonRules?: string,
): string {
  const content  = [sceneContent.trim(), composition.trim()].filter(Boolean).join("。");
  const arHint   = aspectRatio && aspectRatio !== "auto" ? `横縦比は${aspectRatio}で出力してください。` : "";
  const qHint    = qualityHint && QUALITY_HINT_MAP[qualityHint] ? QUALITY_HINT_MAP[qualityHint] : "";
  const negHint  = negativePrompt?.trim() ? `以下の要素は含めないでください: ${negativePrompt.trim()}。` : "";
  const rules    = commonRules?.trim() ?? "";
  const base = [content, arHint, qHint, rules, negHint].filter(Boolean).join(" ");
  if (style === "photo") {
    return base + " 実写またはCGグラフィックで表現してください。イラスト調・アニメ調は使用しないでください。";
  }
  if (style === "illustration") {
    return base + " イラストスタイルで描いてください。";
  }
  return base;
}

// ── Seedream 用プロンプト構築 ─────────────────────────────────────────────────

function buildSeedreamPrompt(style: string, sceneContent: string, composition: string, commonRules?: string, negativePrompt?: string): string {
  const content = [sceneContent.trim(), composition.trim()].filter(Boolean).join("。");
  const rules   = commonRules?.trim() ?? "";
  const negHint = negativePrompt?.trim() ? `以下の要素は含めないでください: ${negativePrompt.trim()}。` : "";
  const base    = [content, rules, negHint].filter(Boolean).join(" ");
  if (style === "photo") {
    return base + " 実写またはCGグラフィックで表現してください。イラスト調・アニメ調は使用しないでください。";
  }
  return base;
}

// ── POST /api/storyboard/[id]/scenes/[sceneId]/generate-image ───────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; sceneId: string } },
) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const sb = await prisma.storyboardMain.findUnique({ where: { id: params.id } });
  if (!sb || sb.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const scene = await prisma.storyboardScene.findUnique({ where: { id: params.sceneId } });
  if (!scene || scene.mainId !== params.id)
    return NextResponse.json({ ok: false, message: "見つかりません" }, { status: 404 });

  const body = await request.json().catch(() => ({})) as {
    style?: string;
    sceneContent?: string;
    composition?: string;
    imgUrl?: string | null;
    imageModel?: string;
    // 全モデル共通
    imgCommonRules?: string;
    imgNegativePrompt?: string;
    // Reve AI
    aspectRatio?: string;
    version?: string;
    testTimeScaling?: number;
    upscaleFactor?: number;
    removeBg?: boolean;
    fitImageMaxDim?: number;
    // Seedream 5.0 Pro
    sdAspectRatio?: string;
    sdResolution?: string;
    sdOutputFormat?: string;
    sdWatermark?: boolean;
    sdOptimizePrompt?: boolean;
    // Google AI (Nano Banana)
    googleAspectRatio?: string;
    googleOutputFormat?: string;
    googleQualityHint?: string;
  };

  const {
    style = "photo",
    sceneContent = "",
    composition = "",
    imgUrl,
    imageModel = "reve-1",
  } = body;

  // ── Seedream 5.0 Pro ─────────────────────────────────────────────────────────
  if (imageModel === "seedream-5-0-pro") {
    const arkApiKey = process.env.ARK_API_KEY;
    if (!arkApiKey)
      return NextResponse.json({ ok: false, message: "ARK_API_KEY が設定されていません" }, { status: 500 });

    const arkModel = process.env.IMAGE_GEN_MODEL;
    if (!arkModel)
      return NextResponse.json({ ok: false, message: "IMAGE_GEN_MODEL が設定されていません" }, { status: 500 });

    const {
      sdAspectRatio  = "16:9",
      sdResolution   = "1K",
      sdOutputFormat = "jpeg",
      sdWatermark    = false,
      sdOptimizePrompt = false,
    } = body;

    const prompt = buildSeedreamPrompt(style, sceneContent, composition, body.imgCommonRules, body.imgNegativePrompt);
    if (!prompt.trim())
      return NextResponse.json({ ok: false, message: "シーン内容または構図を入力してください" }, { status: 400 });

    const size = resolveSeedreamSize(sdResolution as "1K" | "2K", sdAspectRatio);

    // 参照画像（optional）
    let referenceImageB64: string | undefined;
    if (imgUrl) {
      try {
        const imgRes = await fetch(imgUrl);
        referenceImageB64 = `data:image/png;base64,${Buffer.from(await imgRes.arrayBuffer()).toString("base64")}`;
      } catch {
        // 参照画像が取得できなければ T2I として続行
      }
    }

    const arkBody: Record<string, unknown> = {
      model: arkModel,
      prompt,
      size,
      output_format: sdOutputFormat,
      watermark: sdWatermark,
      response_format: "b64_json",
    };
    if (referenceImageB64) arkBody.image = referenceImageB64;
    if (sdOptimizePrompt) arkBody.optimize_prompt_options = { mode: "standard" };

    let imageB64: string;
    let ext = sdOutputFormat === "png" ? "png" : "jpg";
    let contentType = sdOutputFormat === "png" ? "image/png" : "image/jpeg";

    try {
      const resp = await fetch(ARK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${arkApiKey}`,
        },
        body: JSON.stringify(arkBody),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`ARK ${resp.status}: ${errText}`);
      }
      const data = await resp.json() as { data?: Array<{ b64_json?: string; error?: { message: string } }>; error?: { message: string } };
      if (data.error) throw new Error(data.error.message);
      const item = data.data?.[0];
      if (!item?.b64_json) throw new Error("画像データが返されませんでした");
      imageB64 = item.b64_json;
    } catch (e) {
      await logError("generate-image", `ARK API error: ${e}`, { userId: session.userId, detail: { storyboardId: params.id, sceneId: params.sceneId } });
      return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
    }

    const imgBuffer = Buffer.from(imageB64, "base64");
    const wsSegment = (sb as any).workspaceId ?? "no-workspace";
    const key = `user/${sb.userId}/${wsSegment}/generate/${params.sceneId}/image-${Date.now()}.${ext}`;
    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: imgBuffer,
        ContentType: contentType,
      }));
    } catch (e) {
      await logError("generate-image", `R2 upload error: ${e}`, { userId: session.userId, detail: { key } });
      return NextResponse.json({ ok: false, message: `R2アップロードに失敗しました: ${e}` }, { status: 500 });
    }

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    await prisma.storyboardScene.update({
      where: { id: params.sceneId },
      data: { imgUrl: publicUrl, imgStatusYn: true },
    });
    await prisma.file.create({
      data: {
        userId:      session.userId,
        workspaceId: (sb as any).workspaceId ?? null,
        storageKey:  key,
        fileUrl:     publicUrl,
        fileName:    key.split("/").pop() ?? "generated-image",
        fileType:    "image",
        mimeType:    contentType,
        sizeBytes:   BigInt(imgBuffer.length),
      },
    }).catch(() => {});
    await logGeneration(session.userId, "img");
    return NextResponse.json({ ok: true, imgUrl: publicUrl });
  }

  // ── Google Gemini 画像生成 ────────────────────────────────────────────────────
  if (imageModel === "google-image-lite" || imageModel === "google-image-pro") {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey)
      return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    const googleModelId = imageModel === "google-image-lite"
      ? "gemini-3.1-flash-lite-image"
      : "gemini-3-pro-image";

    const {
      googleAspectRatio = "16:9",
      googleQualityHint = "",
    } = body;

    const prompt = buildGoogleImagePrompt(style, sceneContent, composition, googleAspectRatio, body.imgNegativePrompt, googleQualityHint, body.imgCommonRules);
    if (!prompt.trim())
      return NextResponse.json({ ok: false, message: "シーン内容または構図を入力してください" }, { status: 400 });

    console.log(`[Google image] sceneId=${params.sceneId} model=${googleModelId} imgUrl=${imgUrl ? "あり" : "なし"} prompt=${prompt}`);

    // テキストパーツ（参照画像があれば先頭に追加）
    const parts: Record<string, unknown>[] = [];
    if (imgUrl) {
      try {
        const imgRes = await fetch(imgUrl);
        const imageBytes = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
        parts.push({ inlineData: { mimeType: "image/jpeg", data: imageBytes } });
      } catch {
        // 参照画像が取得できなければ T2I として続行
      }
    }
    parts.push({ text: prompt });

    const googleBody = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    };

    let imageB64: string;
    let mimeType = "image/jpeg";
    try {
      const resp = await fetch(
        `${GOOGLE_AI_BASE}/models/${googleModelId}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": googleApiKey },
          body: JSON.stringify(googleBody),
        },
      );
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Google ${resp.status}: ${errText}`);
      }
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
      await logError("generate-image", `Google API error: ${e}`, { userId: session.userId, detail: { storyboardId: params.id, sceneId: params.sceneId } });
      return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
    }

    const ext = mimeType === "image/png" ? "png" : "jpg";
    const imgBuffer = Buffer.from(imageB64, "base64");
    const wsSegment = (sb as any).workspaceId ?? "no-workspace";
    const key = `user/${sb.userId}/${wsSegment}/generate/${params.sceneId}/image-${Date.now()}.${ext}`;
    try {
      await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: imgBuffer, ContentType: mimeType }));
    } catch (e) {
      await logError("generate-image", `R2 upload error: ${e}`, { userId: session.userId, detail: { key } });
      return NextResponse.json({ ok: false, message: `R2アップロードに失敗しました: ${e}` }, { status: 500 });
    }

    const publicUrl = `${R2_PUBLIC_URL}/${key}`;
    await prisma.storyboardScene.update({ where: { id: params.sceneId }, data: { imgUrl: publicUrl, imgStatusYn: true } });
    await prisma.file.create({
      data: {
        userId:      session.userId,
        workspaceId: (sb as any).workspaceId ?? null,
        storageKey:  key,
        fileUrl:     publicUrl,
        fileName:    key.split("/").pop() ?? "generated-image",
        fileType:    "image",
        mimeType:    mimeType,
        sizeBytes:   BigInt(imgBuffer.length),
      },
    }).catch(() => {});
    await logGeneration(session.userId, "img");
    return NextResponse.json({ ok: true, imgUrl: publicUrl });
  }

  // ── Reve AI (reve-1) ─────────────────────────────────────────────────────────

  const apiKey = process.env.REVE_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "REVE_API_KEY が設定されていません" }, { status: 500 });

  const {
    aspectRatio    = "16:9",
    version        = "latest",
    testTimeScaling = 1,
    upscaleFactor  = 0,
    removeBg       = false,
    fitImageMaxDim = 0,
  } = body;

  const editInstruction = buildEditInstruction(style, sceneContent, composition, body.imgCommonRules, body.imgNegativePrompt);
  if (!editInstruction.trim())
    return NextResponse.json({ ok: false, message: "シーン内容または構図を入力してください" }, { status: 400 });

  // ── 参照画像の準備 ────────────────────────────────────────────────────────
  let referenceImageB64: string;
  if (imgUrl) {
    try {
      const imgRes = await fetch(imgUrl);
      referenceImageB64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
    } catch {
      referenceImageB64 = buildBlankPng(16, 9).toString("base64");
    }
  } else {
    referenceImageB64 = buildBlankPng(16, 9).toString("base64");
  }

  // ── ポストプロセッシング ───────────────────────────────────────────────────
  const postprocessing: Array<Record<string, unknown>> = [];
  if (upscaleFactor >= 2)  postprocessing.push({ process: "upscale", upscale_factor: upscaleFactor });
  if (removeBg)            postprocessing.push({ process: "remove_background" });
  if (fitImageMaxDim > 0)  postprocessing.push({ process: "fit_image", max_dim: fitImageMaxDim });

  // ── Reve API 呼び出し ─────────────────────────────────────────────────────
  const reveBody: Record<string, unknown> = {
    edit_instruction:  editInstruction,
    reference_image:   referenceImageB64,
    aspect_ratio:      aspectRatio,
    version,
    test_time_scaling: Math.max(1, Math.min(15, Number(testTimeScaling) || 1)),
  };
  if (postprocessing.length > 0) reveBody.postprocessing = postprocessing;

  let imageB64: string;
  try {
    const resp = await fetch(REVE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(reveBody),
    });
    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Reve ${resp.status}: ${errText}`);
    }
    const data = await resp.json() as { image?: string; message?: string; error_code?: string };
    if (!data.image) throw new Error(data.message ?? "画像データが返されませんでした");
    imageB64 = data.image;
  } catch (e) {
    await logError("generate-image", `Reve API error: ${e}`, { userId: session.userId, detail: { storyboardId: params.id, sceneId: params.sceneId } });
    return NextResponse.json({ ok: false, message: `画像生成に失敗しました: ${e}` }, { status: 500 });
  }

  // ── R2 アップロード ───────────────────────────────────────────────────────
  const imgBuffer = Buffer.from(imageB64, "base64");
  const wsSegment = (sb as any).workspaceId ?? "no-workspace";
  const key = `user/${sb.userId}/${wsSegment}/generate/${params.sceneId}/image-${Date.now()}.png`;
  try {
    await r2Client.send(new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: imgBuffer,
      ContentType: "image/png",
    }));
  } catch (e) {
    await logError("generate-image", `R2 upload error: ${e}`, { userId: session.userId, detail: { key } });
    return NextResponse.json({ ok: false, message: `R2アップロードに失敗しました: ${e}` }, { status: 500 });
  }

  const publicUrl = `${R2_PUBLIC_URL}/${key}`;

  await prisma.storyboardScene.update({
    where: { id: params.sceneId },
    data: { imgUrl: publicUrl, imgStatusYn: true },
  });
  await prisma.file.create({
    data: {
      userId:      session.userId,
      workspaceId: (sb as any).workspaceId ?? null,
      storageKey:  key,
      fileUrl:     publicUrl,
      fileName:    key.split("/").pop() ?? "generated-image",
      fileType:    "image",
      mimeType:    "image/png",
      sizeBytes:   BigInt(imgBuffer.length),
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, imgUrl: publicUrl });
}
