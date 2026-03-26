import crypto from "crypto";

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getSessionExpiresAt(days = 30): Date {
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}