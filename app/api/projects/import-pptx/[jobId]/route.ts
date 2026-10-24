export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ownJob } from "@/lib/pptx.import.job";
import { runImport } from "@/lib/pptx.import";
import { getEditJsonFromR2 } from "@/lib/project.r2";
import { narrationEstimate } from "@/lib/pptx.narration";

const STALE_MS = 20 * 60 * 1000;

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

  const running = job.status === "converting" || job.status === "narrating";
  if (running && Date.now() - job.updatedAt.getTime() > STALE_MS) {
    const message = "変換が時間内に終わりませんでした";
    await prisma.importJob.update({ where: { id: job.id }, data: { status: "error", message, errorCode: "TIMEOUT" } });
    return NextResponse.json({ ok: true, status: "error", message, errorCode: "TIMEOUT" });
  }

  const project = job.projectId ? await prisma.project.findUnique({ where: { id: job.projectId } }) : null;
  // 変換中は Cloud Run が書き出す進み具合（段階・何枚目か）、ナレーション生成中は何枚目かを返す
  const progress = running ? await getEditJsonFromR2(`${job.outPrefix}/progress.json`) : null;
  const estimate = job.status === "confirm" ? await narrationEstimate(job) : null;
  return NextResponse.json({ ok: true, status: job.status, message: job.message, errorCode: job.errorCode, warnings: job.warnings ?? [], project, progress, estimate });
}
