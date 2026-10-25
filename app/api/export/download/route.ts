export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";
import { prisma } from "@/lib/prisma";
import { outputExpiresAt } from "@/lib/export.render";

// 書き出した動画を「保存」として渡す（書き出しサーバーのURLは別ドメインなので、そのままだとブラウザで再生されてしまう）
export async function GET(req: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ ok: false, message: "未ログインです" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id") ?? "";
  const log = await prisma.logOutput.findFirst({
    where: { id, userId: session.userId },
    include: { project: { select: { title: true } } },
  });
  if (!log?.outputUrl || log.status !== "done")
    return NextResponse.json({ ok: false, message: "書き出した動画が見つかりません" }, { status: 404 });
  if (outputExpiresAt(log).getTime() <= Date.now())
    return NextResponse.json({ ok: false, message: "ダウンロードの有効期限（24時間）が切れました。もう一度書き出してください" }, { status: 410 });

  const upstream = await fetch(log.outputUrl).catch(() => null);
  if (!upstream?.ok || !upstream.body)
    return NextResponse.json({ ok: false, message: "動画を取得できませんでした。もう一度書き出してください" }, { status: 502 });

  const ext = log.outputUrl.split("?")[0].split(".").pop()?.toLowerCase() || "mp4";
  const name = `${(log.project?.title || "hisui-video").replace(/[\\/:*?"<>|]/g, "_")}.${ext}`;
  const headers = new Headers({
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="video.${ext}"; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "private, no-store",
  });
  const len = upstream.headers.get("content-length");
  if (len) headers.set("Content-Length", len);
  return new NextResponse(upstream.body, { headers });
}
