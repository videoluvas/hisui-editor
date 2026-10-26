import type { AnimSettings } from "@/lib/pptx.effects";
import type { Project } from "@/lib/project.api";

export type ImportStatus = "uploading" | "converting" | "confirm" | "narrating" | "done" | "error";

// ナレーションを作る前に見せる、ノートの文字数と使う量（無料：回数、スタンダード：今月の文字数、法人：クレジット）
export type NarrationEstimate = {
  slides: number; withNotes: number; chars: number; kind: "free" | "chars" | "credits";
  credits: number; balance: number; freeLeft: number; freeLimit: number; charsLeft: number; charsLimit: number;
  blocked: string | null;
};
export type ImportWarning = { slide: number; code: string; message: string };

async function safeJson(res: Response) {
  try { return await res.json(); } catch { return { ok: false, message: `通信エラー（${res.status}）` }; }
}

export async function createPptxImport(p: {
  workspaceId: string; title: string; secPerSlide: number; pptxSize: number; pdfSize: number;
  animationMode: "recommended" | "custom"; animations: AnimSettings; stagger: boolean; narration?: { voice: string; padBefore: number; padAfter: number };
}): Promise<{ ok: boolean; jobId?: string; pptxUrl?: string; pdfUrl?: string; message?: string }> {
  const res = await fetch("/api/projects/import-pptx", {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  return safeJson(res);
}

// 送れたバイト数を onProgress で知らせる（進捗バー用。fetch では取れないので XHR を使う）
export function uploadToPresigned(url: string, file: File, contentType: string, onProgress?: (loaded: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => onProgress?.(e.loaded);
    xhr.onload = () => { onProgress?.(file.size); resolve(xhr.status >= 200 && xhr.status < 300); };
    xhr.onerror = () => resolve(false);
    xhr.send(file);
  });
}

export type ConvertProgress = { stage: "parse" | "render" | "objects" | "upload" | "narration"; done: number; total: number; at: number };

export async function startPptxImport(jobId: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/projects/import-pptx/${jobId}`, { method: "POST", credentials: "include" });
  return safeJson(res);
}

export async function getPptxImport(jobId: string): Promise<{
  ok: boolean; status?: ImportStatus; message?: string | null; errorCode?: string | null; warnings?: ImportWarning[]; project?: Project | null; progress?: ConvertProgress | null; estimate?: NarrationEstimate | null;
}> {
  const res = await fetch(`/api/projects/import-pptx/${jobId}`, { credentials: "include", cache: "no-store" });
  return safeJson(res);
}

export async function confirmPptxNarration(jobId: string, generate: boolean): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/projects/import-pptx/${jobId}/narration`, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ generate }),
  });
  return safeJson(res);
}
