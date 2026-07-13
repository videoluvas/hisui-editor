export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";

const ARK_API_BASE   = "https://ark.ap-southeast.bytepluses.com/api/v3";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function extractSeedanceUrl(data: Record<string, unknown>): string | null {
  const contentRaw = data.content;
  const contentArr: unknown[] = Array.isArray(contentRaw) ? contentRaw : contentRaw != null ? [contentRaw] : [];
  for (const c of contentArr) {
    const vUrl = (c as Record<string, unknown>)?.video_url;
    if (typeof vUrl === "string" && vUrl) return vUrl;
    if (vUrl && typeof (vUrl as Record<string, unknown>).url === "string") return (vUrl as Record<string, unknown>).url as string;
  }
  const tl = data.video_url;
  if (typeof tl === "string" && tl) return tl;
  if (tl && typeof (tl as Record<string, unknown>).url === "string") return (tl as Record<string, unknown>).url as string;
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const taskId   = searchParams.get("taskId");
  const provider = searchParams.get("provider") ?? "seedance";
  const workspaceId = searchParams.get("workspaceId") ?? null;

  if (!taskId) return NextResponse.json({ ok: false, message: "taskId が必要です" }, { status: 400 });

  const userId = session.userId;

  // ── Google Veo ───────────────────────────────────────────────────────────────
  if (provider === "veo-3" || provider === "veo-3-lite") {
    const operationName = taskId.startsWith("veo:") ? taskId.slice(4) : taskId;
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    try {
      const resp = await fetch(`${GOOGLE_AI_BASE}/${operationName}`, {
        headers: { "x-goog-api-key": googleApiKey },
      });

      if (!resp.ok) {
        if (resp.status === 404) return NextResponse.json({ ok: true, status: "running" });
        throw new Error(`Google ${resp.status}: ${await resp.text()}`);
      }

      const data = await resp.json() as {
        name: string;
        done?: boolean;
        error?: { message: string };
        response?: {
          generateVideoResponse?: {
            generatedSamples?: Array<{ video: { uri: string } }>;
            raiMediaFilteredCount?: number;
            raiMediaFilteredReasons?: string[];
          };
        };
      };

      if (data.error) return NextResponse.json({ ok: false, status: "failed", message: data.error.message });

      if (data.done) {
        const genVidResp = data.response?.generateVideoResponse;
        const samples = genVidResp?.generatedSamples ?? (data.response as any)?.generatedSamples;
        const videoUri = samples?.[0]?.video?.uri;

        if (!videoUri) {
          const raiCount   = genVidResp?.raiMediaFilteredCount ?? 0;
          const raiReasons = genVidResp?.raiMediaFilteredReasons ?? [];
          const errMsg = raiCount > 0
            ? (raiReasons[0] ?? "コンテンツポリシーによりフィルタリングされました")
            : "動画URIが返されませんでした";
          return NextResponse.json({ ok: false, status: "failed", message: errMsg });
        }

        const downloadUrl = videoUri.includes("alt=media") ? videoUri : `${videoUri}?alt=media`;
        const dlResp = await fetch(downloadUrl, { headers: { "x-goog-api-key": googleApiKey } });
        if (!dlResp.ok) throw new Error(`動画ダウンロードに失敗: ${dlResp.status}`);

        const videoBuffer = Buffer.from(await dlResp.arrayBuffer());
        const key = `user/${userId}/editor/videos/${Date.now()}.mp4`;
        await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: videoBuffer, ContentType: "video/mp4" }));
        const videoUrl = `${R2_PUBLIC_URL}/${key}`;

        await prisma.file.create({
          data: { userId, workspaceId, storageKey: key, fileUrl: videoUrl, fileName: key.split("/").pop() ?? "video.mp4", fileType: "video", mimeType: "video/mp4", sizeBytes: BigInt(videoBuffer.length) },
        }).catch(() => {});

        await logGeneration(userId, "video");
        return NextResponse.json({ ok: true, status: "succeeded", videoUrl });
      }

      return NextResponse.json({ ok: true, status: "running" });
    } catch (e) {
      await logError("editor-generate-video-status", `Veo poll error: ${e}`, { userId, detail: { operationName } });
      return NextResponse.json({ ok: false, status: "running", message: `ステータス取得に失敗: ${e}` }, { status: 500 });
    }
  }

  // ── BytePlus Seedance ────────────────────────────────────────────────────────
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) return NextResponse.json({ ok: false, message: "ARK_API_KEY が設定されていません" }, { status: 500 });

  try {
    const resp = await fetch(`${ARK_API_BASE}/contents/generations/tasks/${taskId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });
    if (!resp.ok) throw new Error(`BytePlus ${resp.status}: ${await resp.text()}`);

    const data = await resp.json() as Record<string, unknown>;
    console.log(`[Seedance editor] raw response: ${JSON.stringify(data)}`);

    const status   = (data.status as string | undefined) ?? "unknown";
    const errField = data.error as { message?: string } | undefined;

    if (status === "succeeded") {
      const externalUrl = extractSeedanceUrl(data);
      console.log(`[Seedance editor] succeeded. taskId=${taskId} externalUrl=${externalUrl}`);
      if (externalUrl) {
        try {
          const dlResp = await fetch(externalUrl);
          if (!dlResp.ok) throw new Error(`BytePlus download ${dlResp.status}`);
          const videoBuffer = Buffer.from(await dlResp.arrayBuffer());
          const key = `user/${userId}/editor/videos/${Date.now()}.mp4`;
          await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: videoBuffer, ContentType: "video/mp4" }));
          const videoUrl = `${R2_PUBLIC_URL}/${key}`;
          await prisma.file.create({
            data: { userId, workspaceId, storageKey: key, fileUrl: videoUrl, fileName: key.split("/").pop() ?? "video.mp4", fileType: "video", mimeType: "video/mp4", sizeBytes: BigInt(videoBuffer.length) },
          }).catch(() => {});
          await logGeneration(userId, "video");
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl });
        } catch {
          await logGeneration(userId, "video");
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl: externalUrl });
        }
      }
      await logError("editor-generate-video-status", `Seedance succeeded but no video_url found`, { userId, detail: { taskId } });
      return NextResponse.json({ ok: false, status: "failed", message: "動画URLが取得できませんでした（APIレスポンスにvideo_urlが含まれていません）" });
    }

    if (status === "failed" || status === "expired") {
      const errMsg = errField?.message ?? status;
      await logError("editor-generate-video-status", `BytePlus task ${status}: ${errMsg}`, { userId, detail: { taskId } });
      return NextResponse.json({ ok: false, status, message: errMsg });
    }

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    await logError("editor-generate-video-status", `BytePlus poll error: ${e}`, { userId, detail: { taskId } });
    return NextResponse.json({ ok: false, message: `ステータス取得に失敗: ${e}` }, { status: 500 });
  }
}
