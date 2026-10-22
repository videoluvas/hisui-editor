export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { getEditJsonFromR2 } from "@/lib/project.r2";
import { R2_PUBLIC_URL } from "@/lib/fileupload.r2";
import { pptxObjectKind } from "@/lib/clip.kind";
import type { PptxObjectKind } from "@/lib/clip.kind";
import type { PptxManifest } from "@/lib/pptx.import";

// パワーポイントから取り込んだプロジェクトの「ファイル URL → 種類」を manifest から返す
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const project = await prisma.project.findUnique({ where: { id: params.id }, select: { userId: true } });
  if (!project || project.userId !== session.userId)
    return NextResponse.json({ ok: false, message: "プロジェクトが見つかりません" }, { status: 404 });

  const job = await prisma.importJob.findFirst({
    where: { projectId: params.id, status: "done" },
    select: { manifestKey: true, outPrefix: true },
  });
  if (!job?.manifestKey) return NextResponse.json({ ok: true, kinds: {} });

  const manifest = await getEditJsonFromR2<PptxManifest>(job.manifestKey);
  if (!manifest) return NextResponse.json({ ok: true, kinds: {} });

  const url = (file: string) => `${R2_PUBLIC_URL}/${job.outPrefix}/${file}`;
  const kinds: Record<string, PptxObjectKind> = {};
  for (const s of manifest.slides) {
    kinds[url(s.background)] = "pptx-background";
    for (const o of s.objects) {
      if (o.file) kinds[url(o.file)] = pptxObjectKind(o.kind);
      if (o.media) kinds[url(o.media.file)] = pptxObjectKind(o.kind, o.media.type);
    }
  }
  return NextResponse.json({ ok: true, kinds });
}
