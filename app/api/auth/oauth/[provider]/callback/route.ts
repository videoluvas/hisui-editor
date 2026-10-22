export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, isConfigured, isProvider } from "@/lib/auth.oauth";
import { attachSession, findOrCreateUserByEmail } from "@/lib/auth.signup";
import { logError } from "@/lib/log.error";
import { safeNext } from "@/lib/auth.next";

// ポップアップなら元の画面に結果を知らせて閉じる。
// Google などの画面を経由すると opener が切れることがあるので、そのときは閉じるだけにする（元の画面はログイン状態を確認して進む）
function finish(ok: boolean, message = "", next: string | null = null) {
  const payload = JSON.stringify({ type: "hisui-auth", ok, message, next }).replace(/</g, "\\u003c");
  const text = ok ? "ログインしました。この画面を閉じて、元の画面に戻ってください。" : `ログインできませんでした。${message}`;
  const html = `<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>ヒスイAI</title></head>
<body style="font-family:sans-serif;color:#334155;padding:24px;line-height:1.8">${text.replace(/</g, "&lt;")}
<script>
  var data = ${payload};
  if (window.opener) { window.opener.postMessage(data, window.location.origin); if (data.ok) window.close(); }
  else if (data.next) window.location.replace(data.ok ? data.next : "/auth?next=" + encodeURIComponent(data.next) + "&error=" + encodeURIComponent(data.message));
  else if (data.ok) window.close();
</script></body></html>`;
  const res = new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  res.cookies.set("oauth_state", "", { path: "/api/auth/oauth", maxAge: 0 });
  res.cookies.set("oauth_next", "", { path: "/api/auth/oauth", maxAge: 0 });
  return res;
}

export async function GET(req: NextRequest, { params }: { params: { provider: string } }) {
  const p = params.provider;
  const next = safeNext(req.cookies.get("oauth_next")?.value);
  if (!isProvider(p) || !isConfigured(p)) return finish(false, "このログイン方法は使えません", next);

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || !state || req.cookies.get("oauth_state")?.value !== `${p}:${state}`)
    return finish(false, "ログインの確認に失敗しました。もう一度お試しください", next);

  try {
    const profile = await exchangeCode(req, p, code);
    const { user } = await findOrCreateUserByEmail(profile.email, profile.name, profile.picture);
    return attachSession(finish(true, "", next), user.id);
  } catch (e) {
    await logError("auth", `OAuth ログイン失敗 (${p}): ${e}`, { level: "warn" });
    return finish(false, e instanceof Error ? e.message : "ログインに失敗しました", next);
  }
}
