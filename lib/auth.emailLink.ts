import crypto from "crypto";

const TTL_MS = 15 * 60 * 1000;

function sign(body: string): string {
  return crypto.createHmac("sha256", process.env.AUTH_LINK_SECRET!).update(body).digest("base64url");
}

// メールアドレスと有効期限を署名したトークン（DB に保存しない。15 分で無効）
export function createLoginToken(email: string): string {
  const body = Buffer.from(JSON.stringify({ e: email, x: Date.now() + TTL_MS })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyLoginToken(token: string): string | null {
  const [body, mac] = token.split(".");
  if (!body || !mac || !process.env.AUTH_LINK_SECRET) return null;
  const expected = sign(body);
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return typeof e === "string" && typeof x === "number" && Date.now() <= x ? e : null;
  } catch {
    return null;
  }
}
