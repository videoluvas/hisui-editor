const TOAST_EVENT = "hisui:toast";

export type ToastKind = "error" | "info";
export type ToastDetail = { message: string; kind: ToastKind };

// 画面下に通知を出す（alert の代わり。layout の Toaster が表示する）
export const toast = (message: string, kind: ToastKind = "error") =>
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, kind } }));

export const onToast = (fn: (t: ToastDetail) => void) => {
  const handler = (e: Event) => fn((e as CustomEvent<ToastDetail>).detail);
  window.addEventListener(TOAST_EVENT, handler);
  return () => window.removeEventListener(TOAST_EVENT, handler);
};
