// 「パワーポイントから作成」の途中経過（ファイル・設定・ステップ）をブラウザ内（IndexedDB）に保存し、
// ログインでページを移動したり再読み込みしたりしても続きから再開できるようにする

const DB_NAME = "hisui-pptx-draft";
const STORE = "draft";
const KEY = "current";
const TTL_MS = 24 * 60 * 60 * 1000;

export type PptxDraft = {
  step: string;
  pptx: File | null;
  pdf: File | null;
  settings: Record<string, unknown>;
  savedAt: number;
};

type Stored = Omit<PptxDraft, "pptx" | "pdf"> & {
  pptx: { blob: Blob; name: string; type: string } | null;
  pdf: { blob: Blob; name: string; type: string } | null;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T | null> {
  try {
    const db = await open();
    return await new Promise<T | null>((resolve) => {
      const req = fn(db.transaction(STORE, mode).objectStore(STORE));
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

const pack = (f: File | null) => (f ? { blob: f as Blob, name: f.name, type: f.type } : null);
const unpack = (p: Stored["pptx"]) => (p ? new File([p.blob], p.name, { type: p.type }) : null);

export async function saveDraft(d: Omit<PptxDraft, "savedAt">): Promise<void> {
  const value: Stored = { ...d, pptx: pack(d.pptx), pdf: pack(d.pdf), savedAt: Date.now() };
  await run("readwrite", (s) => s.put(value, KEY));
}

export async function loadDraft(): Promise<PptxDraft | null> {
  const v = await run<Stored>("readonly", (s) => s.get(KEY));
  if (!v || !v.pptx || Date.now() - v.savedAt > TTL_MS) return null;
  return { ...v, pptx: unpack(v.pptx), pdf: unpack(v.pdf) };
}

export async function clearDraft(): Promise<void> {
  await run("readwrite", (s) => s.delete(KEY));
}
