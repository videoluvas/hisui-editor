import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

export async function ownJob(jobId: string) {
  const session = await getEditorSessionFromCookie();
  if (!session) return { error: NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 }) };
  const job = await prisma.importJob.findUnique({ where: { id: jobId } });
  if (!job || job.userId !== session.userId)
    return { error: NextResponse.json({ ok: false, message: "取り込みが見つかりません" }, { status: 404 }) };
  return { job };
}
