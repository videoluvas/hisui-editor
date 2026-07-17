// ─── 型定義 ───────────────────────────────────────────────────────────────────

export type AudioSettings = {
  // 既存フィールド（互換維持）
  speaker?: string;
  emotion?: string;
  speed?: string;
  // Google Gemini TTS フィールド（null = ワークスペース設定を継承）
  ttsProvider?: string | null;
  ttsModel?: string | null;
  ttsVoice?: string | null;
  ttsStyle?: string | null;
  ttsPacing?: string | null;
  ttsTone?: string | null;
  ttsAccent?: string | null;
};

export type StoryboardSceneData = {
  id: string;
  mainId: string;
  sceneNo: number | null;
  title: string | null;
  duration: string | null;
  sourceTextChunk: string | null;
  naText: string | null;
  telopText: string | null;
  imgError: string | null;
  imgErrorYn: boolean;
  imgPrompt: string | null;
  imgPromptAngle: string | null;
  imgPromptContent: string | null;
  imgStatusYn: boolean;
  imgStyle: string;
  imgStyleIllust: string | null;
  imgStyleUnifiedId: string | null;
  imgUrl: string | null;
  imgUrlDl: string | null;
  videoError: string | null;
  videoErrorYn: boolean;
  videoId: string | null;
  videoPrompt: string | null;
  videoCameraFixed: boolean;
  videoDuration: number | null;
  videoGenerateAudio: boolean;
  videoStartTime: string | null;
  videoStatus: string;
  videoStatusYn: boolean;
  videoText: string | null;
  videoUrl: string | null;
  audioText: string | null;
  audioUrl: string | null;
  audioSettings: AudioSettings | null;
  createdAt: string;
  updatedAt: string;
};

export type StoryboardMainData = {
  id: string;
  userId: string;
  projectId: string | null;
  slug: string | null;
  title: string | null;
  originalScript: string | null;
  duration: string | null;
  prompt: string | null;
  speed: string | null;
  status: string;
  aiScriptLog: string | null;
  aiScriptLogEx: string | null;
  createdAt: string;
  updatedAt: string;
  scenes: StoryboardSceneData[];
};

export type StoryboardListItem = {
  id: string;
  title: string | null;
  status: string;
  updatedAt: string;
  sceneCount: number;
};

// ─── APIクライアント ──────────────────────────────────────────────────────────

export async function listStoryboards(workspaceId?: string | null): Promise<{ ok: boolean; items: StoryboardListItem[]; message?: string }> {
  const url = workspaceId ? `/api/storyboard?workspaceId=${workspaceId}` : "/api/storyboard";
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  return res.json();
}

export async function createStoryboard(data: { title?: string; workspaceId?: string | null }): Promise<{ ok: boolean; storyboard?: StoryboardMainData; message?: string }> {
  const res = await fetch("/api/storyboard", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getStoryboard(id: string): Promise<{ ok: boolean; storyboard?: StoryboardMainData; message?: string }> {
  const res = await fetch(`/api/storyboard/${id}`, { credentials: "include", cache: "no-store" });
  return res.json();
}

export async function updateStoryboard(id: string, data: Partial<Omit<StoryboardMainData, "id" | "userId" | "scenes" | "createdAt" | "updatedAt">>): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/storyboard/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteStoryboard(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/storyboard/${id}`, { method: "DELETE", credentials: "include" });
  return res.json();
}

export async function createScene(mainId: string, data: Partial<Omit<StoryboardSceneData, "id" | "mainId" | "createdAt" | "updatedAt">>): Promise<{ ok: boolean; scene?: StoryboardSceneData; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function updateScene(mainId: string, sceneId: string, data: Partial<Omit<StoryboardSceneData, "id" | "mainId" | "createdAt" | "updatedAt">>): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteScene(mainId: string, sceneId: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}`, { method: "DELETE", credentials: "include" });
  return res.json();
}

export async function generateSceneScript(
  mainId: string,
  sceneId: string,
  data: { sourceText: string; model?: string; commonRules?: string; negativePrompt?: string },
): Promise<{ ok: boolean; naText?: string; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}/generate-script`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateSceneTelopText(
  mainId: string,
  sceneId: string,
  data: { sourceText: string; model?: string; commonRules?: string; negativePrompt?: string },
): Promise<{ ok: boolean; telopText?: string; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}/generate-telop`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateSceneImage(
  mainId: string,
  sceneId: string,
  data: {
    style: string;
    sceneContent: string;
    composition: string;
    imgUrl?: string | null;
    imageModel?: string;
    // Reve AI
    aspectRatio?: string;
    version?: string;
    testTimeScaling?: number;
    upscaleFactor?: number;
    removeBg?: boolean;
    fitImageMaxDim?: number;
    // Seedream 5.0 Pro
    sdAspectRatio?: string;
    sdResolution?: string;
    sdOutputFormat?: string;
    sdWatermark?: boolean;
    sdOptimizePrompt?: boolean;
    // 全モデル共通
    imgCommonRules?: string;
    imgNegativePrompt?: string;
    // Google AI (Nano Banana)
    googleAspectRatio?: string;
    googleOutputFormat?: string;
    googleQualityHint?: string;
    // Google AI - imageSize / thinking
    googleImageSize?: string;
    googleThinkingLevel?: string;
    // GPT Image 2 (high) / GPT Image 1.5 (high)
    gptSize?: string;
    gptQuality?: string;
    gptBackground?: string;
    gptCompression?: number;
    gptModeration?: string;
    gptOutputFormat?: string;
  },
): Promise<{ ok: boolean; imgUrl?: string; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}/generate-image`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateSceneVideo(
  mainId: string,
  sceneId: string,
  data: {
    videoModel?: string;
    instructions?: string;
    resolution?: string;
    ratio?: string;
    duration?: number;
    generateAudio?: boolean;
    cameraFixed?: boolean;
    watermark?: boolean;
    seed?: number;
    personGeneration?: string;
    compressionQuality?: string;
    vidCommonRules?: string;
    vidNegativePrompt?: string;
  },
): Promise<{ ok: boolean; taskId?: string; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}/generate-video`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function pollVideoStatus(
  mainId: string,
  sceneId: string,
): Promise<{ ok: boolean; status?: string; videoUrl?: string; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}/generate-video/status`, {
    credentials: "include",
  });
  return res.json();
}

export async function generateSceneNarration(
  mainId: string,
  sceneId: string,
  data: {
    transcript: string;
    provider: string;
    model: string;
    voice: string;
    style: string;
    pacing: string;
    tone: string;
    accent: string;
    autoChunk: boolean;
    maxChunkLength: number;
    retryCount: number;
    ttsCommonRules?: string;
    ttsNegativePrompt?: string;
  },
): Promise<{ ok: boolean; audioUrl?: string; audioDuration?: number; message?: string }> {
  const res = await fetch(`/api/storyboard/${mainId}/scenes/${sceneId}/generate-narration`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function generateStoryboard(
  id: string,
  data: { sourceText: string; prompt?: string; duration: number; speed: string },
): Promise<{ ok: boolean; sceneCount?: number; message?: string }> {
  const res = await fetch(`/api/storyboard/${id}/generate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function convertStoryboardToProject(
  id: string,
  settings?: Record<string, unknown>,
): Promise<{ ok: boolean; project?: Record<string, unknown>; message?: string }> {
  const res = await fetch(`/api/storyboard/${id}/to-project`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings ?? {}),
  });
  return res.json();
}
