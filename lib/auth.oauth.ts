import crypto from "crypto";
import type { NextRequest } from "next/server";

export type OAuthProvider = "google" | "microsoft";

const MS_CONSUMER_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad";

const CONFIG: Record<OAuthProvider, { authorize: string; token: string; scope: string; id: string; secret: string }> = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    id: "GOOGLE_CLIENT_ID",
    secret: "GOOGLE_CLIENT_SECRET",
  },
  microsoft: {
    authorize: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scope: "openid email profile",
    id: "MICROSOFT_CLIENT_ID",
    secret: "MICROSOFT_CLIENT_SECRET",
  },
};

export function isProvider(v: string): v is OAuthProvider {
  return v === "google" || v === "microsoft";
}

export function isConfigured(p: OAuthProvider): boolean {
  return !!process.env[CONFIG[p].id] && !!process.env[CONFIG[p].secret];
}

// リバースプロキシの後ろでも、ブラウザから見たオリジンを使う
export function requestOrigin(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

const redirectUri = (req: NextRequest, p: OAuthProvider) => `${requestOrigin(req)}/api/auth/oauth/${p}/callback`;

export function authorizeUrl(req: NextRequest, p: OAuthProvider, state: string): string {
  const c = CONFIG[p];
  const q = new URLSearchParams({
    client_id: process.env[c.id]!,
    redirect_uri: redirectUri(req, p),
    response_type: "code",
    scope: c.scope,
    state,
    prompt: "select_account",
  });
  return `${c.authorize}?${q}`;
}

export function newState(): string {
  return crypto.randomBytes(24).toString("hex");
}

type Profile = { email: string; name: string | null; picture: string | null };

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
}

// 認可コードをトークンに交換し、ID トークン（トークンエンドポイントから直接受け取ったもの）からメールアドレスを取り出す
export async function exchangeCode(req: NextRequest, p: OAuthProvider, code: string): Promise<Profile> {
  const c = CONFIG[p];
  const res = await fetch(c.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env[c.id]!,
      client_secret: process.env[c.secret]!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(req, p),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.id_token) throw new Error("ログインに失敗しました");
  const claims = decodeJwtPayload(data.id_token);

  if (p === "google") {
    if (!claims.email || claims.email_verified !== true) throw new Error("Google アカウントのメールアドレスが確認できません");
    return { email: String(claims.email).toLowerCase(), name: (claims.name as string) ?? null, picture: (claims.picture as string) ?? null };
  }

  // Microsoft: 組織アカウントは管理者がメールを自由に設定できるため、確認済み（xms_edov）か個人アカウントだけ受け付ける
  const email = (claims.email as string | undefined) ?? null;
  const verified = claims.tid === MS_CONSUMER_TENANT || claims.xms_edov === true || claims.xms_edov === "1";
  if (!email || !verified) throw new Error("この Microsoft アカウントはメールアドレスが確認できないため、ログインに使えません");
  return { email: email.toLowerCase(), name: (claims.name as string) ?? null, picture: null };
}
