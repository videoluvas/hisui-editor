import { NextRequest, NextResponse } from "next/server";
import { getEditorSessionFromCookie } from "@/lib/auth.backend";

const ALLOWED_HOST = "assets.hisui-ai.com";

export async function GET(request: NextRequest) {
  const session = await getEditorSessionFromCookie();
  if (!session) return NextResponse.json({ error: "未ログインです" }, { status: 401 });

  const url      = request.nextUrl.searchParams.get("url");
  const filename = request.nextUrl.searchParams.get("filename") ?? "download";
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const parsed = new URL(url);
    if (parsed.hostname !== ALLOWED_HOST)
      return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });

    const data = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
