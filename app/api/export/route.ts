export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { getEditJsonFromR2 } from "@/lib/project.r2";
import type { VideoExportSettings } from "@/lib/videoExportSettings";
import { RESOLUTION_MAP } from "@/lib/exportSettings";

type ProjectWithKey = { id: string; userId: string; editJsonKey: string | null };

export async function POST(req: NextRequest) {
  try {
    const session = await getEditorSessionFromCookie();
    if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

    const body = await req.json();
    const { projectId } = body;
    const renderSettings: Partial<VideoExportSettings> = body.renderSettings ?? {};

    if (!projectId) return NextResponse.json({ ok: false, message: "projectIdが必要です" }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId } }) as ProjectWithKey | null;
    if (!project || project.userId !== session.user.id)
      return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });

    if (!project.editJsonKey)
      return NextResponse.json({ ok: false, message: "editJsonKeyがありません" }, { status: 400 });

    const editJson = await getEditJsonFromR2(project.editJsonKey) as Record<string, unknown>;
    if (!editJson) return NextResponse.json({ ok: false, message: "editJsonの取得に失敗しました" }, { status: 500 });

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

    const res = await fetch(`${process.env.SHOTSTACK_API_URL}/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.SHOTSTACK_API_KEY!,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ ok: false, message: data?.response?.message ?? "書き出しAPIエラー" }, { status: 500 });

    return NextResponse.json({ ok: true, renderId: data.response.id });
  } catch (error) {
    console.error("POST /api/export error:", error);
    return NextResponse.json({ ok: false, message: "サーバーエラーが発生しました" }, { status: 500 });
  }
}