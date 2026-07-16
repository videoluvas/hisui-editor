export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { logError } from "@/lib/log.error";
import { logGeneration } from "@/lib/log.generation";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import type { CreditAction } from "@/lib/credits";

const ARK_API_BASE   = "https://ark.ap-southeast.bytepluses.com/api/v3";
const GOOGLE_AI_BASE = "https://generativelanguage.googleapis.com/v1beta";

// Retrieve レスポンスから動画URLを柔軟に抽出
// content が配列・単一オブジェクトどちらでも対応、トップレベルの video_url もチェック
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

// MP4 mvhd ボックスから動画尺（秒）を取得する
function getMp4DurationSec(buf: Buffer): number | null {
  const idx = buf.indexOf(Buffer.from("mvhd"));
  if (idx < 0) return null;
  try {
    const version = buf[idx + 4];
    if (version === 0) {
      const timescale = buf.readUInt32BE(idx + 16);
      const duration  = buf.readUInt32BE(idx + 20);
      if (timescale > 0) return Math.round((duration / timescale) * 100) / 100;
    } else if (version === 1) {
      const timescale = buf.readUInt32BE(idx + 24);
      const durHi     = buf.readUInt32BE(idx + 28);
      const durLo     = buf.readUInt32BE(idx + 32);
      const duration  = durHi * 4294967296 + durLo;
      if (timescale > 0) return Math.round((duration / timescale) * 100) / 100;
    }
  } catch {}
  return null;
}

export async function GET(
  _request: NextRequest,
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

  if (!scene.videoId)
    return NextResponse.json({ ok: false, message: "タスクが存在しません" }, { status: 404 });

  // ── Google Veo ポーリング ────────────────────────────────────────────────────
  if (scene.videoId.startsWith("veo:")) {
    const operationName = scene.videoId.slice(4);
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey)
      return NextResponse.json({ ok: false, message: "GOOGLE_AI_API_KEY が設定されていません" }, { status: 500 });

    try {
      const pollUrl = `${GOOGLE_AI_BASE}/${operationName}`;
      console.log(`[Veo poll] ${pollUrl}`);

      const resp = await fetch(pollUrl, {
        headers: { "x-goog-api-key": googleApiKey },
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`[Veo poll] HTTP ${resp.status}: ${errText}`);
        // 404 はオペレーションがまだ登録されていない可能性があるため、引き続きポーリングする
        if (resp.status === 404) {
          return NextResponse.json({ ok: true, status: "running", detail: "queued" });
        }
        throw new Error(`Google ${resp.status}: ${errText}`);
      }

      const data = await resp.json() as {
        name: string;
        done?: boolean;
        error?: { message: string; code: number };
        response?: {
          generateVideoResponse?: {
            generatedSamples?: Array<{ video: { uri: string; encoding?: string } }>;
            raiMediaFilteredCount?: number;
            raiMediaFilteredReasons?: string[];
          };
        };
        metadata?: { state?: string };
      };

      if (data.error) {
        const errMsg = data.error.message;
        await logError("generate-video", `Veo operation failed: ${errMsg}`, {
          userId: session.userId,
          detail: { operation: operationName, sceneId: params.sceneId },
        });
        await prisma.storyboardScene.update({
          where: { id: params.sceneId },
          data: { videoStatus: "failed", videoStatusYn: false, videoErrorYn: true, videoError: errMsg },
        });
        return NextResponse.json({ ok: false, status: "failed", message: errMsg });
      }

      if (data.done) {
        // generateVideoResponse ラッパーあり・なし両方に対応
        const genVidResp = data.response?.generateVideoResponse;
        const samples = genVidResp?.generatedSamples ?? (data.response as any)?.generatedSamples;
        const videoUri = samples?.[0]?.video?.uri;
        console.log(`[Veo poll] done. uri=${videoUri}, response=${JSON.stringify(data.response)}`);

        if (!videoUri) {
          // RAI フィルタリングで動画が作られなかった場合は failed として確定
          const raiCount = genVidResp?.raiMediaFilteredCount ?? 0;
          const raiReasons = genVidResp?.raiMediaFilteredReasons ?? [];
          const errMsg = raiCount > 0
            ? (raiReasons[0] ?? "コンテンツポリシーによりフィルタリングされました")
            : "動画URIが返されませんでした";
          await logError("generate-video", `Veo RAI filtered (op: ${operationName}): ${errMsg}`, {
            userId: session.userId,
            detail: { operation: operationName, sceneId: params.sceneId, raiCount, raiReasons },
          });
          await prisma.storyboardScene.update({
            where: { id: params.sceneId },
            data: { videoStatus: "failed", videoStatusYn: false, videoErrorYn: true, videoError: errMsg },
          });
          return NextResponse.json({ ok: false, status: "failed", message: errMsg });
        }

        // Google Files API からダウンロード（URIに ?alt=media が既に含まれる場合は追加しない）
        const downloadUrl = videoUri.includes("alt=media") ? videoUri : `${videoUri}?alt=media`;
        const downloadResp = await fetch(downloadUrl, {
          headers: { "x-goog-api-key": googleApiKey },
        });
        if (!downloadResp.ok) throw new Error(`動画ダウンロードに失敗: ${downloadResp.status}`);

        const videoBuffer = Buffer.from(await downloadResp.arrayBuffer());
        const wsSegment = (sb as any).workspaceId ?? "no-workspace";
        const key = `user/${sb.userId}/${wsSegment}/generate/${params.sceneId}/video-${Date.now()}.mp4`;

        await r2Client.send(new PutObjectCommand({
          Bucket: R2_BUCKET_NAME,
          Key: key,
          Body: videoBuffer,
          ContentType: "video/mp4",
        }));

        const publicUrl = `${R2_PUBLIC_URL}/${key}`;
        const videoDuration = getMp4DurationSec(videoBuffer);
        await prisma.storyboardScene.update({
          where: { id: params.sceneId },
          data: { videoUrl: publicUrl, videoStatus: "succeeded", videoStatusYn: true, videoErrorYn: false, ...(videoDuration != null ? { videoDuration } : {}) },
        });
        await prisma.file.create({
          data: {
            userId:      session.userId,
            workspaceId: (sb as any).workspaceId ?? null,
            storageKey:  key,
            fileUrl:     publicUrl,
            fileName:    key.split("/").pop() ?? "generated-video.mp4",
            fileType:    "video",
            mimeType:    "video/mp4",
            sizeBytes:   BigInt(videoBuffer.length),
          },
        }).catch(() => {});
        await logGeneration(session.userId, "video_premium_audio" as CreditAction);
        return NextResponse.json({ ok: true, status: "succeeded", videoUrl: publicUrl });
      }

      // まだ処理中
      const state = data.metadata?.state ?? "PROCESSING";
      await prisma.storyboardScene.update({
        where: { id: params.sceneId },
        data: { videoStatus: "running" },
      });
      return NextResponse.json({ ok: true, status: "running", detail: state });
    } catch (e) {
      console.error(`[Veo poll] catch error for ${operationName}:`, e);
      await logError("generate-video", `Veo status error (op: ${operationName}): ${e}`, {
        userId: session.userId,
        detail: { operation: operationName, sceneId: params.sceneId },
      });
      return NextResponse.json({ ok: false, status: "running", message: `ステータス取得に失敗しました: ${e}` }, { status: 500 });
    }
  }

  // ── BytePlus Seedance ポーリング ─────────────────────────────────────────────
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey)
    return NextResponse.json({ ok: false, message: "ARK_API_KEY が設定されていません" }, { status: 500 });

  try {
    const resp = await fetch(`${ARK_API_BASE}/contents/generations/tasks/${scene.videoId}`, {
      headers: { "Authorization": `Bearer ${apiKey}` },
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`BytePlus ${resp.status}: ${errText}`);
    }

    const data = await resp.json() as Record<string, unknown>;
    console.log(`[Seedance storyboard] raw response: ${JSON.stringify(data)}`);

    const status = (data.status as string | undefined) ?? "unknown";
    const errField = data.error as { message?: string } | undefined;

    if (status === "succeeded") {
      const externalUrl = extractSeedanceUrl(data);
      console.log(`[Seedance storyboard] succeeded. sceneId=${params.sceneId} externalUrl=${externalUrl}`);

      if (externalUrl) {
        // BytePlus の外部URLを R2 にダウンロード保存してファイル一覧に追加
        try {
          const dlResp = await fetch(externalUrl);
          if (!dlResp.ok) throw new Error(`BytePlus download ${dlResp.status}`);
          const videoBuffer = Buffer.from(await dlResp.arrayBuffer());
          const wsSegment = (sb as any).workspaceId ?? "no-workspace";
          const key = `user/${sb.userId}/${wsSegment}/generate/${params.sceneId}/video-${Date.now()}.mp4`;
          await r2Client.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: videoBuffer,
            ContentType: "video/mp4",
          }));
          const publicUrl = `${R2_PUBLIC_URL}/${key}`;
          const videoDuration = getMp4DurationSec(videoBuffer);
          await prisma.storyboardScene.update({
            where: { id: params.sceneId },
            data: { videoUrl: publicUrl, videoStatus: "succeeded", videoStatusYn: true, videoErrorYn: false, ...(videoDuration != null ? { videoDuration } : {}) },
          });
          await prisma.file.create({
            data: {
              userId:      session.userId,
              workspaceId: (sb as any).workspaceId ?? null,
              storageKey:  key,
              fileUrl:     publicUrl,
              fileName:    key.split("/").pop() ?? "generated-video.mp4",
              fileType:    "video",
              mimeType:    "video/mp4",
              sizeBytes:   BigInt(videoBuffer.length),
            },
          }).catch(() => {});
          await logGeneration(session.userId, "video_lite" as CreditAction);
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl: publicUrl });
        } catch (dlErr) {
          // ダウンロード失敗時は外部URLで保存（フォールバック）
          await prisma.storyboardScene.update({
            where: { id: params.sceneId },
            data: { videoUrl: externalUrl, videoStatus: "succeeded", videoStatusYn: true, videoErrorYn: false },
          });
          await logGeneration(session.userId, "video_lite" as CreditAction);
          return NextResponse.json({ ok: true, status: "succeeded", videoUrl: externalUrl });
        }
      }

      // succeeded だが video_url が取得できなかった場合はエラー確定
      const errMsg = "動画URLが取得できませんでした（APIレスポンスにvideo_urlが含まれていません）";
      await logError("generate-video", `Seedance succeeded but no video_url found`, {
        userId: session.userId,
        detail: { taskId: scene.videoId, sceneId: params.sceneId },
      });
      await prisma.storyboardScene.update({
        where: { id: params.sceneId },
        data: { videoStatus: "failed", videoStatusYn: false, videoErrorYn: true, videoError: errMsg },
      });
      return NextResponse.json({ ok: false, status: "failed", message: errMsg });
    }

    if (status === "failed" || status === "expired") {
      const errMsg = errField?.message ?? status;
      await logError("generate-video", `BytePlus task ${status}: ${errMsg}`, {
        userId: session.userId,
        detail: { taskId: scene.videoId, sceneId: params.sceneId },
      });
      await prisma.storyboardScene.update({
        where: { id: params.sceneId },
        data: { videoStatus: status, videoStatusYn: false, videoErrorYn: true, videoError: errMsg },
      });
      return NextResponse.json({ ok: false, status, message: errMsg });
    }

    await prisma.storyboardScene.update({
      where: { id: params.sceneId },
      data: { videoStatus: status },
    });

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    await logError("generate-video", `BytePlus status error: ${e}`, {
      userId: session.userId,
      detail: { taskId: scene.videoId, sceneId: params.sceneId },
    });
    return NextResponse.json({ ok: false, message: `ステータス取得に失敗しました: ${e}` }, { status: 500 });
  }
}
