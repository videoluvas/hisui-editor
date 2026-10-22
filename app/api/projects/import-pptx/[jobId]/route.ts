export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { runImport } from "@/lib/pptx.import";
import { getEditJsonFromR2 } from "@/lib/project.r2";

const STALE_MS = 20 * 60 * 1000;

async function ownJob(jobId: string) {
  const session = await getEditorSessionFromCookie();
  if (!session) return { error: NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 }) };
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== session.userId)
    return { error: NextResponse.json({ ok: false, message: "取り込みが見つかりません" }, { status: 404 }) };
  return { job };
}

// アップロード完了 → 変換開始（変換はバックグラウンドで続き、状態は GET で確認する）
export async function POST(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const { job, error } = await ownJob(params.jobId);
  if (error) return error;
  if (job.status !== "uploading")
    return NextResponse.json({ ok: false, message: "この取り込みはすでに開始しています" }, { status: 409 });

  await prisma.importJob.update({ where: { id: job.id }, data: { status: "converting" } });
  void runImport(job.id);
  return NextResponse.json({ ok: true });
}

export async function GET(_req: NextRequest, { params }: { params: { jobId: string } }) {
  const { job, error } = await ownJob(params.jobId);
  if (error) return error;

  if (job.status === "converting" && Date.now() - job.updatedAt.getTime() > STALE_MS) {
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "error", message: "変換がタイムアウトしました。もう一度お試しください" } });
    return NextResponse.json({ ok: true, status: "error", message: "変換がタイムアウトしました。もう一度お試しください" });
  }

  const project = job.projectId ? await prisma.project.findUnique({ where: { id: job.projectId } }) : null;
  // 変換中は Cloud Run が書き出す進み具合（段階・何枚目か）を返す
  const progress = job.status === "converting" ? await getEditJsonFromR2(`${job.outPrefix}/progress.json`) : null;
  return NextResponse.json({ ok: true, status: job.status, message: job.message, warnings: job.warnings ?? [], project, progress });
}
