export type GenMetaImage = {
  type: "ai-image";
  prompt: string;
  model: string;
  aspectRatio: string;
};

export type GenMetaVideo = {
  type: "ai-video";
  prompt: string;
  model: string;
  ratio: string;
  duration: number;
  refImageUrl?: string;
};

export type GenMetaNarration = {
  type: "ai-narration";
  transcript: string;
  voice: string;
  pacing: string;
  tone: string;
};

export type GenMetaDeco = {
  type: "deco-telop";
  settings: Record<string, unknown>;
};

export type GenMeta = GenMetaImage | GenMetaVideo | GenMetaNarration | GenMetaDeco;

function metaKey(fileUrl: string) {
  return `hisui_gen_meta_${fileUrl}`;
}

export function saveGenMeta(fileUrl: string, meta: GenMeta): void {
  try { localStorage.setItem(metaKey(fileUrl), JSON.stringify(meta)); } catch {}
}

export function loadGenMeta(fileUrl: string): GenMeta | null {
  try {
    const v = localStorage.getItem(metaKey(fileUrl));
    return v ? (JSON.parse(v) as GenMeta) : null;
  } catch { return null; }
}

export function deleteGenMeta(fileUrl: string): void {
  try { localStorage.removeItem(metaKey(fileUrl)); } catch {}
}
