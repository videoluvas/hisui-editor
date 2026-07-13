export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";

export async function POST(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session)
    return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as {
    prompt?: string;
    genre?: string;
    mood?: string;
    vocal?: "yes" | "no";
    duration?: number;
    workspaceId?: string;
    model?: string;
  };

  const combinedPrompt = buildPrompt(body);
  if (!combinedPrompt.trim())
    return NextResponse.json({ ok: false, message: "プロンプトが空です" }, { status: 400 });

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

  const model = (body.model ?? "lyria-3-pro-preview").trim();

  try {
    const res = await fetch(`${GOOGLE_AI_BASE}/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: combinedPrompt }] }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Lyria API ${res.status}: ${errText}`);
    }

    const data = await res.json() as {
      candidates?: Array<{
        content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string }; text?: string }> };
      }>;
    };

    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => p.inlineData?.data);
    if (!audioPart?.inlineData?.data)
      throw new Error("音楽データが返されませんでした");

    const audioBuffer = Buffer.from(audioPart.inlineData.data, "base64");
    const mimeType = audioPart.inlineData.mimeType ?? "audio/mp3";
    const ext = mimeType.includes("wav") ? "wav" : "mp3";

    const fileId = uuidv4();
    const wsSegment = body.workspaceId ?? "no-workspace";
    const key = `user/${session.userId}/${wsSegment}/bgm/${fileId}.${ext}`;
    const fileName = buildFileName(body);

    try {
      await r2Client.send(new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        Body: audioBuffer,
        ContentType: mimeType,
      }));
    } catch (uploadErr) {
      await logError("bgm-generate", `R2 upload error: ${uploadErr}`, {
        userId: session.userId,
        detail: { key },
      });
      return NextResponse.json({ ok: false, message: "音声ファイルのアップロードに失敗しました" }, { status: 500 });
    }

    const audioUrl = `${R2_PUBLIC_URL}/${key}`;

    await prisma.file.create({
      data: {
        userId: session.userId,
        workspaceId: body.workspaceId ?? null,
        storageKey: key,
        fileUrl: audioUrl,
        fileName,
        fileType: "audio",
        mimeType,
      } as any,
    });

    return NextResponse.json({ ok: true, audioUrl });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await logError("bgm-generate", msg, { userId: session.userId });

    if (msg.includes("401") || msg.includes("403"))
      return NextResponse.json({ ok: false, message: "Google APIキーが無効または権限がありません" }, { status: 500 });
    if (msg.includes("429"))
      return NextResponse.json({ ok: false, message: "Google APIの利用上限に達しました" }, { status: 429 });

    return NextResponse.json({ ok: false, message: `BGM生成に失敗しました: ${msg}` }, { status: 500 });
  }
}

function buildFileName(opts: {
  genre?: string;
  mood?: string;
  vocal?: "yes" | "no";
  prompt?: string;
}): string {
  const GENRE_JA: Record<string, string> = {
    Pop: "ポップ", Jazz: "ジャズ", Classical: "クラシック", Electronic: "エレクトロニック",
    Cinematic: "シネマティック", Ambient: "アンビエント", "Lo-fi": "Lo-fi", Rock: "ロック",
  };
  const MOOD_JA: Record<string, string> = {
    Happy: "明るい", Calm: "穏やか", Epic: "壮大", Melancholic: "切ない",
    Energetic: "エネルギッシュ", Mysterious: "神秘的", Romantic: "ロマンチック", Tense: "緊張感",
  };
  const parts = ["BGM"];
  if (opts.genre) parts.push(GENRE_JA[opts.genre] ?? opts.genre);
  if (opts.mood) parts.push(MOOD_JA[opts.mood] ?? opts.mood);
  if (opts.vocal === "no") parts.push("インスト");
  else if (opts.vocal === "yes") parts.push("ボーカルあり");
  if (parts.length === 1 && opts.prompt?.trim()) {
    parts.push(opts.prompt.trim().slice(0, 20));
  }
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${parts.join("_")}_${date}.mp3`;
}

function buildPrompt(opts: {
  prompt?: string;
  genre?: string;
  mood?: string;
  vocal?: "yes" | "no";
  duration?: number;
}): string {
  const parts: string[] = [];
  if (opts.genre?.trim()) parts.push(opts.genre.trim());
  if (opts.mood?.trim()) parts.push(`${opts.mood.trim()} mood`);
  if (opts.vocal === "no") parts.push("no vocals, instrumental only");
  if (opts.vocal === "yes") parts.push("with vocals");
  if (opts.duration && opts.duration > 0) parts.push(`approximately ${opts.duration} seconds`);
  if (opts.prompt?.trim()) parts.push(opts.prompt.trim());
  return parts.join(", ");
}
