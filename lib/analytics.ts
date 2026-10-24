// ─── GA4（ブラウザ側） ───────────────────────────────────────────────────────
// 流れ：LP表示 → アップロード開始 → 取り込み成功 → 初回書き出し → サブスク登録
// LUVAS（luvas.red）の LP から来た人を同じ人として追うため、両方のサイトで同じ測定 ID とクロスドメイン設定を使う

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const GA_LINKER_DOMAINS = ["luvas.red", "hisui-ai.com"];

export const UTM_COOKIE = "hisui_utm";
export const SIGNUP_COOKIE = "hisui_signup";
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const;
const UTM_MAX_AGE = 90 * 24 * 60 * 60;

export type AnalyticsEvent =
  | "pptx_lp_view"
  | "pptx_upload_start"
  | "pptx_import_success"
  | "video_export"
  | "sign_up"
  | "contact_submit";

export function track(name: AnalyticsEvent, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", name, params);
}

function readCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// 最初に来たときの utm を残す（登録時にサーバーが読んで users.signup_utm に保存する）
export function captureUtm() {
  if (readCookie(UTM_COOKIE)) return;
  const q = new URLSearchParams(window.location.search);
  const utm = Object.fromEntries(UTM_KEYS.flatMap((k) => (q.get(k) ? [[k, q.get(k)!.slice(0, 100)]] : [])));
  if (!Object.keys(utm).length) return;
  const value = encodeURIComponent(JSON.stringify({ ...utm, landing: window.location.pathname, at: new Date().toISOString() }));
  document.cookie = `${UTM_COOKIE}=${value}; path=/; max-age=${UTM_MAX_AGE}; samesite=lax`;
}

// 登録直後にサーバーが付けた印を見て、sign_up を 1 回だけ送る
export function flushSignup() {
  const method = readCookie(SIGNUP_COOKIE);
  if (!method) return;
  document.cookie = `${SIGNUP_COOKIE}=; path=/; max-age=0`;
  track("sign_up", { method });
}
