export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { ownJob } from "@/lib/pptx.import.job";
import { confirmNarration } from "@/lib/pptx.narration";

// 確認画面の「ナレーションを作って続ける」（generate: true）/「ナレーションなしで続ける」（false）
export async function POST(req: NextRequest, { params }: { params: { jobId: string } }) {
  const { job, error } = await ownJob(params.jobId);
  if (error) return error;
  const body = await req.json().catch(() => ({}));
  const res = await confirmNarration(job, body.generate === true);
  if (!res.ok) return NextResponse.json({ ok: false, message: res.message }, { status: res.status ?? 400 });
  return NextResponse.json({ ok: true });
}
