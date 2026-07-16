export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { getEditJsonFromR2 } from "@/lib/project.r2";
import type { VideoExportSettings } from "@/lib/videoExportSettings";
import { RESOLUTION_MAP } from "@/lib/exportSettings";
import { consumeCredits, refundCredits, exportAction, exportMultiplier } from "@/lib/credits";

type ProjectWithKey = { id: string; userId: string; workspaceId: string | null; editJsonKey: string | null; durationSec: number | null };

export async function POST(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const body = await req.json();
    const { projectId } = body;
    const renderSettings: Partial<VideoExportSettings> = body.renderSettings ?? {};

    if (!projectId) return NextResponse.json({ ok: false, message: "projectIdが必要です" }, { status: 400 });

    const [project, dbUser] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, userId: true, workspaceId: true, editJsonKey: true, durationSec: true },
      }) as Promise<ProjectWithKey | null>,
      prisma.user.findUnique({ where: { id: session.userId }, select: { plan: true } }),
    ]);
    if (!project || project.userId !== session.userId)
      return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });

    if (!project.editJsonKey)
      return NextResponse.json({ ok: false, message: "editJsonKeyがありません" }, { status: 400 });

    const isFreeUser = !dbUser?.plan || dbUser.plan === "Free";
    const useSandbox = isFreeUser || (renderSettings.sandboxMode ?? false);
    // SHOTSTACK_API_KEY / SHOTSTACK_API_URL は現在サンドボックス環境
    // 本番（透かしなし）は SHOTSTACK_PROD_API_KEY / SHOTSTACK_PROD_API_URL を使用
    const apiKey = useSandbox
      ? process.env.SHOTSTACK_API_KEY!
      : (process.env.SHOTSTACK_PROD_API_KEY ?? process.env.SHOTSTACK_API_KEY!);
    const apiUrl = useSandbox
      ? process.env.SHOTSTACK_API_URL!
      : (process.env.SHOTSTACK_PROD_API_URL ?? process.env.SHOTSTACK_API_URL!);

    const resolution = renderSettings.resolution ?? "1080p";
    const durationSec = project.durationSec ?? 60;
    const action = exportAction(resolution);
    const mult = exportMultiplier(durationSec);

    if (!useSandbox) {
      const credit = await consumeCredits(session.userId, action, project.workspaceId, mult);
      if (!credit.ok) return NextResponse.json({ ok: false, message: credit.message }, { status: 402 });
    }

    const editJson = await getEditJsonFromR2(project.editJsonKey) as Record<string, unknown>;
    if (!editJson) {
      if (!useSandbox) await refundCredits(session.userId, action, project.workspaceId, mult);
      return NextResponse.json({ ok: false, message: "editJsonの取得に失敗しました" }, { status: 500 });
    }

    // ── ShotStack output設定を上書き ────────────────────────────────────────────
    const baseOutput = (editJson.output ?? {}) as Record<string, unknown>;

    const outputOverride: Record<string, unknown> = {
      ...baseOutput,
      format:  renderSettings.format  ?? baseOutput.format  ?? "mp4",
      quality: renderSettings.quality ?? baseOutput.quality ?? "medium",
    };

    // 解像度（シーケンス連動）: renderSettings.resolution → RESOLUTION_MAP で size に変換
    if (renderSettings.resolution && RESOLUTION_MAP[renderSettings.resolution]) {
      const { width, height } = RESOLUTION_MAP[renderSettings.resolution];
      outputOverride.size = { width, height };
    }

    // FPS（シーケンス連動）
    if (renderSettings.fps) {
      outputOverride.fps = renderSettings.fps;
    }

    // 背景色（シーケンス連動）
    if (renderSettings.backgroundColor) {
      const timeline = (editJson.timeline ?? {}) as Record<string, unknown>;
      (editJson as Record<string, unknown>).timeline = {
        ...timeline,
        background: renderSettings.backgroundColor,
      };
    }

    if (renderSettings.mute) {
      outputOverride.mute = true;
    }
    if (renderSettings.posterEnabled && renderSettings.posterCapture != null) {
      outputOverride.poster = { capture: renderSettings.posterCapture };
    }
    if (renderSettings.thumbnailEnabled && renderSettings.thumbnailCapture != null) {
      outputOverride.thumbnail = {
        capture: renderSettings.thumbnailCapture,
        scale:   renderSettings.thumbnailScale ?? 0.3,
      };
    }

    const payload: Record<string, unknown> = {
      ...editJson,
      output: outputOverride,
    };

    // callback はEdit最上位フィールド
    if (renderSettings.callbackUrl?.trim()) {
      payload.callback = renderSettings.callbackUrl.trim();
    }

    const res = await fetch(`${apiUrl}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      if (!useSandbox) await refundCredits(session.userId, action, project.workspaceId, mult);
      return NextResponse.json({ ok: false, message: data?.response?.message ?? "書き出しAPIエラー" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, renderId: data.response.id });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}