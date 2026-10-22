export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { IMPORT_MAX_BYTES, importPrefix, presignInputs } from "@/lib/pptx.import";
import { sanitizeAnimSettings } from "@/lib/pptx.effects";

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

  if (!workspaceId) return NextResponse.json({ ok: false, message: "workspaceIdが必要です" }, { status: 400 });
  const ws = await prisma.workspace.findFirst({ where: { id: workspaceId, userId: session.userId } });
  if (!ws) return NextResponse.json({ ok: false, message: "ワークスペースが見つかりません" }, { status: 404 });
  if (ws.toolType !== "pptx")
    return NextResponse.json({ ok: false, message: "パワーポイント用のワークスペースではありません" }, { status: 400 });
  if (!pptxSize || !pdfSize)
    return NextResponse.json({ ok: false, message: ".pptx と PDF の両方を選んでください" }, { status: 400 });
  if (pptxSize > IMPORT_MAX_BYTES || pdfSize > IMPORT_MAX_BYTES)
    return NextResponse.json({ ok: false, message: `ファイルは 1 つ ${IMPORT_MAX_BYTES / 1024 / 1024}MB までです` }, { status: 400 });

  const jobId = crypto.randomUUID();
  const prefix = importPrefix(session.userId, workspaceId, jobId);
  await prisma.importJob.create({
    data: {
      id: jobId,
      userId: session.userId,
      workspaceId,
      options: { title: title ?? "", secPerSlide, animationMode, animations, stagger },
      inputPrefix: `${prefix}/in`,
      outPrefix: `${prefix}/out`,
    },
  });

  return NextResponse.json({ ok: true, jobId, ...(await presignInputs(`${prefix}/in`)) });
}
