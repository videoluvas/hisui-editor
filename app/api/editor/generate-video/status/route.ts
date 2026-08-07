export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import type { CreditAction } from "@/lib/credits";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";

function providerToAction(provider: string): CreditAction {
  if (provider === "veo-3-lite")      return "video_lite";
  if (provider === "veo-3")           return "video_premium_audio";
  if (provider === "kling-v2")        return "video_lite";
  if (provider === "kling-v2-master") return "video_premium_no_audio";
  if (provider === "kling-v3")        return "video_kling_v3";       // 実際の音声有無は消費済み、ログのみ
  if (provider === "kling-v3-turbo")  return "video_kling_turbo";
  return "video_lite";
}

const ARK_API_BASE   = "https://ark.ap-southeast.bytepluses.com/api/v3";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const KLING_API_BASE = "https://api-singapore.klingai.com";

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

        await logGeneration(userId, providerToAction(provider));
        return NextResponse.json({ ok: true, status: "succeeded", videoUrl });
      }

      return NextResponse.json({ ok: true, status: "running" });
    } catch (e) {
      await logError("editor-generate-video-status", `Veo poll error: ${e}`, { userId, detail: { operationName } });
      return NextResponse.json({ ok: false, status: "running", message: `ステータス取得に失敗: ${e}` }, { status: 500 });
    }
  }

  // ── Kling AI ─────────────────────────────────────────────────────────────────
  if (taskId.startsWith("kling:") || taskId.startsWith("kling-t2v:") || taskId.startsWith("kling-i2v:")) {
    const klingApiKey = process.env.KLING_API_KEY;
    if (!klingApiKey) return NextResponse.json({ ok: false, message: "KLING_API_KEY が設定されていません" }, { status: 500 });

    const klingTaskId = taskId.startsWith("kling:")
      ? taskId.slice("kling:".length)
      : taskId.startsWith("kling-t2v:")
        ? taskId.slice("kling-t2v:".length)
        : taskId.slice("kling-i2v:".length);

    try {
      const resp = await fetch(`${KLING_API_BASE}/tasks?task_ids=${klingTaskId}`, {
        headers: { "Authorization": `Bearer ${klingApiKey}` },
      });
      if (!resp.ok) throw new Error(`Kling ${resp.status}: ${await resp.text()}`);

      const data = await resp.json() as {
        code: number;
        message: string;
        data?: Array<{
          id: string;
          status: string;
          message?: string;
          outputs?: Array<{ type: string; url: string; duration?: string }>;
        }>;
      };

      if (data.code !== 0) return NextResponse.json({ ok: false, status: "failed", message: data.message });

      const task = data.data?.[0];
      if (!task) return NextResponse.json({ ok: true, status: "running" });

      if (task.status === "succeeded") {
        const videoExtUrl = task.outputs?.find(o => o.type === "video")?.url;
        if (!videoExtUrl) return NextResponse.json({ ok: false, status: "failed", message: "動画URLが返されませんでした" });

        try {
          const dlResp = await fetch(videoExtUrl);
          if (!dlResp.ok) throw new Error(`Kling download ${dlResp.status}`);
          const videoBuffer = Buffer.from(await dlResp.arrayBuffer());
          const key = `user/${userId}/editor/videos/${Date.now()}.mp4`;
          await r2Client.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: videoBuffer, ContentType: "video/mp4" }));
          const videoUrl = `${R2_PUBLIC_URL}/${key}`;
          await prisma.file.create({
            data: { userId, workspaceId, storageKey: key, fileUrl: videoUrl, fileName: key.split("/").pop() ?? "video.mp4", fileType: "video", mimeType: "video/mp4", sizeBytes: BigInt(videoBuffer.length) },
          }).catch(() => {});
          await logGeneration(userId, providerToAction(provider));
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl });
        } catch {
          await logGeneration(userId, providerToAction(provider));
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl: videoExtUrl });
        }
      }

      if (task.status === "failed") {
        const errMsg = task.message ?? "生成に失敗しました";
        await logError("editor-generate-video-status", `Kling task failed: ${errMsg}`, { userId, detail: { klingTaskId } });
        return NextResponse.json({ ok: false, status: "failed", message: errMsg });
      }

      return NextResponse.json({ ok: true, status: "running" });
    } catch (e) {
      await logError("editor-generate-video-status", `Kling poll error: ${e}`, { userId, detail: { klingTaskId } });
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
          await logGeneration(userId, providerToAction(provider));
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl });
        } catch {
          await logGeneration(userId, providerToAction(provider));
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
