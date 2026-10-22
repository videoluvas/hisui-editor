// ログイン後に戻るページ。サイト内のパスだけを許可する（外部サイトへの転送を防ぐ）
export function safeNext(v: unknown): string | null {
  return typeof v === "string" && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") ? v : null;
}
