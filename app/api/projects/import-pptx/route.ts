export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { IMPORT_MAX_BYTES, importPrefix, presignInputs } from "@/lib/pptx.import";
import { sanitizeAnimSettings } from "@/lib/pptx.effects";
import { NARRATION_PAD_AFTER, NARRATION_PAD_BEFORE, clampPad } from "@/lib/pptx.import.shared";
import { GEMINI_VOICES } from "@/lib/ttsSettings";
import { isFreePlan } from "@/lib/credits";
import { FREE_LIMITS } from "@/lib/pricing";

// 取り込みジョブを作り、.pptx / .pdf のアップロード先を返す
export async function POST(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { workspaceId, title, pptxSize, pdfSize } = body as { workspaceId?: string; title?: string; pptxSize?: number; pdfSize?: number };
  const secPerSlide = Math.min(60, Math.max(1, Number(body.secPerSlide) || 5));
  const animationMode = body.animationMode === "custom" ? "custom" : "recommended";
  const animations = sanitizeAnimSettings(body.animations);
  const stagger = !!body.stagger;
  const voice = body.narration?.voice;
  const narration = typeof voice === "string" && (GEMINI_VOICES as readonly string[]).includes(voice)
    ? { voice, padBefore: clampPad(body.narration?.padBefore, NARRATION_PAD_BEFORE), padAfter: clampPad(body.narration?.padAfter, NARRATION_PAD_AFTER) }
    : undefined;

  if (!workspaceId) return NextResponse.json({ ok: false, message: "workspaceIdが必要です" }, { status: 400 });
  const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, userId: session.userId } });
  if (!ws) return NextResponse.json({ ok: false, message: "ワークスペースが見つかりません" }, { status: 404 });
  if (ws.toolType !== "pptx")
    return NextResponse.json({ ok: false, message: "パワーポイント用のワークスペースではありません" }, { status: 400 });
  if (!pptxSize || !pdfSize)
    return NextResponse.json({ ok: false, message: ".pptx と PDF の両方を選んでください" }, { status: 400 });
  if (pptxSize > IMPORT_MAX_BYTES || pdfSize > IMPORT_MAX_BYTES)
    return NextResponse.json({ ok: false, message: `ファイルは 1 つ ${IMPORT_MAX_BYTES / 1024 / 1024}MB までです` }, { status: 400 });
  // 無料プランは 50MB・30 枚まで、埋め込み動画は読み込まない（枚数は変換後に lib/pptx.import.ts で確認）
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { plan: true } });
  const free = isFreePlan(user?.plan);
  if (free && pptxSize > FREE_LIMITS.pptxMB * 1024 * 1024)
    return NextResponse.json({ ok: false, message: `無料プランで取り込めるパワーポイントは ${FREE_LIMITS.pptxMB}MB までです。スタンダードプランなら ${IMPORT_MAX_BYTES / 1024 / 1024}MB まで取り込めます` }, { status: 400 });

  const jobId = crypto.randomUUID();
  const prefix = importPrefix(session.userId, workspaceId, jobId);
  await prisma.importJob.create({
    data: {
      id: jobId,
      userId: session.userId,
      workspaceId,
      options: { title: title ?? "", secPerSlide, animationMode, animations, stagger, ...(narration ? { narration } : {}), ...(free ? { free } : {}) },
      inputPrefix: `${prefix}/in`,
      outPrefix: `${prefix}/out`,
    },
  });

  return NextResponse.json({ ok: true, jobId, ...(await presignInputs(`${prefix}/in`)) });
}
