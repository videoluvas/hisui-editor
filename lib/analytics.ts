// ─── GA4（ブラウザ側） ───────────────────────────────────────────────────────
// 流れ：LP表示 → アップロード開始 → 取り込み成功 → 初回書き出し → サブスク登録
// LUVAS（luvas.red）の LP から来た人を同じ人として追うため、両方のサイトで同じ測定 ID とクロスドメイン設定を使う
// LUVAS からのリンクは utm を付けず ?from=（どのページ）&pos=（どのボタン）で受ける。utm を付けると GA の流入元が luvas に上書きされるため

export const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const GA_LINKER_DOMAINS = ["luvas.red", "hisui-ai.com"];

export const UTM_COOKIE = "hisui_utm";
export const SIGNUP_COOKIE = "hisui_signup";
export const INTERNAL_KEY = "luvas:internal";
const ENTRY_KEYS = ["from", "pos"] as const;
const TRACK_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", ...ENTRY_KEYS] as const;
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

function pick(keys: readonly string[]): Record<string, string> {
  const q = new URLSearchParams(window.location.search);
  return Object.fromEntries(keys.flatMap((k) => (q.get(k) ? [[k, q.get(k)!.slice(0, 100)]] : [])));
}

// LP 表示イベントに付ける、LUVAS のどのページ・ボタンから来たか
export function entryParams(): Record<string, string> {
  return typeof window === "undefined" ? {} : pick(ENTRY_KEYS);
}

// 最初に来たときの utm / from / pos を残す（登録時にサーバーが読んで users.signup_utm に保存する）
export function captureUtm() {
  if (readCookie(UTM_COOKIE)) return;
  const utm = pick(TRACK_KEYS);
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
