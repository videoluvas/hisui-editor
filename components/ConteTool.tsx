"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getStoryboard, createScene, updateScene, deleteScene, generateSceneScript, generateSceneTelopText, generateSceneImage, generateSceneVideo, pollVideoStatus, generateSceneNarration } from "@/lib/storyboard.api";
import type { StoryboardSceneData } from "@/lib/storyboard.api";
import { loadImageSettings } from "@/lib/imageSettings";
import { imageTimeEstimate, videoTimeEstimate } from "@/lib/genTimeEstimate";
import { loadVideoSettings } from "@/lib/videoSettings";
import { loadTtsSettings, GEMINI_TTS_MODELS, GEMINI_VOICES, TTS_PACING_OPTIONS, TTS_TONE_OPTIONS } from "@/lib/ttsSettings";
import { loadScriptSettings } from "@/lib/scriptSettings";
import { loadTelopSettings } from "@/lib/telopSettings";
import { IMAGE_STYLE_TEMPLATES, getTemplateById, TEMPLATE_CATEGORY_LABELS } from "@/lib/imageTemplates";
import type { ImageStyleTemplate } from "@/lib/imageTemplates";
import { getPresignedUrl, getMyFiles } from "@/lib/fileupload.front";
import { saveGenMeta } from "@/lib/gen.meta";
import type { GenMetaVideo } from "@/lib/gen.meta";
import WorkspaceSettingsModal from "@/components/WorkspaceSettingsModal";
import type { WsSettingsTab } from "@/components/WorkspaceSettingsModal";

// ─── Design tokens ────────────────────────────────────────────────────────────
const CYAN    = "#5184F0";
const PURPLE  = "#7F5AF0";
const DARK     = "#646570";
const FONT    = "'Noto Sans JP', sans-serif";
const CARD_R  = "12px";
const CARD_SH = "0 1px 4px rgba(0,0,0,0.06)";
const GRAD_BLUE   = "linear-gradient(45deg, #5184F0, #169385)";
const GRAD_PURPLE = "linear-gradient(45deg, #7F5AF0, #5184F0)";
const GRAD_NOMAL   = "linear-gradient(to bottom, #f8fafd, #f8fafd)";

// ─── Download utility ─────────────────────────────────────────────────────────

async function downloadUrl(url: string, filename: string) {
  try {
    const proxyUrl = `/api/download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error("proxy failed");
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    window.open(url, "_blank");
  }
}

function extFromUrl(url: string): string {
  const path = url.split("?")[0];
  const ext = path.split(".").pop();
  return ext ? `.${ext}` : "";
}

// ─── Upload limits ────────────────────────────────────────────────────────────
const IMG_MAX_BYTES   = 30  * 1024 * 1024;   // 30 MB（4K 相当）
const VID_MAX_BYTES   = 200 * 1024 * 1024;   // 200 MB（フルHD・約20秒相当）
const AUDIO_MAX_BYTES = 100 * 1024 * 1024;   // 100 MB

function checkUploadLimit(file: File, type: "image" | "video" | "audio"): string | null {
  const max = type === "image" ? IMG_MAX_BYTES : type === "audio" ? AUDIO_MAX_BYTES : VID_MAX_BYTES;
  if (file.size <= max) return null;
  const maxMB = Math.round(max / 1024 / 1024);
  const fileMB = (file.size / 1024 / 1024).toFixed(1);
  if (type === "image") return `画像は最大 ${maxMB}MB まで対応しています（4K 相当）。\nこのファイル: ${fileMB} MB`;
  if (type === "audio") return `音声ファイルは最大 ${maxMB}MB まで対応しています。\nこのファイル: ${fileMB} MB`;
  return `動画は最大 ${maxMB}MB まで対応しています（フルHD・約20秒相当）。\nこのファイル: ${fileMB} MB`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ScriptPrompt    = { sourceText: string };

export type ImageMode = "text" | "ref-scene" | "ref-template" | "ref-file" | "ref-upload";
type ImagePrompt = {
  mode: ImageMode;
  sceneContent: string;
  composition: string;
  refSceneId: string | null;     // ref-scene: 参照シーン ID
  refTemplateId: string | null;  // ref-template: テンプレート ID
  refFileUrl: string | null;     // ref-file: ワークスペースファイル URL
  refUploadUrl: string | null;   // ref-upload: アップロード画像 URL
};

type VideoPrompt     = { instructions: string };
type NarrationPrompt = {
  speaker: string;
  emotion: string;
  speed: string;
  // TTS 上書き設定（null = ワークスペース設定を継承）
  ttsVoice: string | null;
  ttsStyle: string | null;
  ttsPacing: string | null;
  ttsTone: string | null;
};

type Scene = {
  id: string;
  title: string;
  script: string;
  telop: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoDuration: number | null;
  narrationUrl: string | null;
  narrationDuration: number | null;
  narrationName: string | null;
  scriptPrompt: ScriptPrompt;
  imagePrompt: ImagePrompt;
  videoPrompt: VideoPrompt;
  narrationPrompt: NarrationPrompt;
};

type StepKey = "script" | "image" | "video" | "narration";
type OpenMap = Record<StepKey, boolean>;

// ─── DB ↔ local mapping ───────────────────────────────────────────────────────

function dbSceneToLocal(s: StoryboardSceneData, idx: number): Scene {
  const as = s.audioSettings as {
    speaker?: string; emotion?: string; speed?: string;
    ttsVoice?: string | null; ttsStyle?: string | null;
    ttsPacing?: string | null; ttsTone?: string | null;
  } | null;
  return {
    id: s.id,
    title: s.title ?? `シーン ${idx + 1}`,
    script: s.naText ?? "",
    telop: s.telopText ?? "",
    imageUrl: s.imgUrl ?? null,
    videoUrl: s.videoUrl ?? null,
    videoDuration: s.videoDuration ?? null,
    narrationUrl: s.audioUrl ?? null,
    narrationDuration: s.duration ? (parseFloat(s.duration) || null) : null,
    narrationName: s.audioText ?? null,
    scriptPrompt: { sourceText: s.sourceTextChunk ?? "" },
    imagePrompt: {
      mode: (s.imgStyle === "ref-scene" || s.imgStyle === "ref-template" || s.imgStyle === "ref-file" || s.imgStyle === "ref-upload")
        ? (s.imgStyle as ImageMode)
        : "text",
      sceneContent: s.imgPromptContent ?? "",
      composition: s.imgPromptAngle ?? "",
      refSceneId:    s.imgStyleUnifiedId ?? null,
      refTemplateId: s.imgStyle === "ref-template" ? (s.imgStyleIllust ?? null) : null,
      refFileUrl:    s.imgStyle === "ref-file"     ? (s.imgStyleIllust ?? null) : null,
      refUploadUrl:  s.imgStyle === "ref-upload"   ? (s.imgStyleIllust ?? null) : null,
    },
    videoPrompt: { instructions: s.videoPrompt ?? "" },
    narrationPrompt: {
      speaker:  as?.speaker  ?? "",
      emotion:  as?.emotion  ?? "ニュートラル",
      speed:    as?.speed    ?? "1.0",
      ttsVoice:  as?.ttsVoice  ?? null,
      ttsStyle:  as?.ttsStyle  ?? null,
      ttsPacing: as?.ttsPacing ?? null,
      ttsTone:   as?.ttsTone   ?? null,
    },
  };
}

function localSceneToDbPatch(s: Scene) {
  return {
    title: s.title,
    naText: s.script || null,
    telopText: s.telop || null,
    imgUrl: s.imageUrl,
    videoUrl: s.videoUrl,
    videoDuration: s.videoDuration,
    audioUrl: s.narrationUrl,
    duration: s.narrationDuration != null ? String(s.narrationDuration) : null,
    audioText: s.narrationName ?? null,
    sourceTextChunk: s.scriptPrompt.sourceText || null,
    imgStyle:          s.imagePrompt.mode,
    imgStyleUnifiedId: s.imagePrompt.mode === "ref-scene"    ? s.imagePrompt.refSceneId    : null,
    imgStyleIllust:    s.imagePrompt.mode === "ref-template" ? s.imagePrompt.refTemplateId
                     : s.imagePrompt.mode === "ref-file"     ? s.imagePrompt.refFileUrl
                     : s.imagePrompt.mode === "ref-upload"   ? s.imagePrompt.refUploadUrl  : null,
    imgPromptContent: s.imagePrompt.sceneContent || null,
    imgPromptAngle:   s.imagePrompt.composition  || null,
    videoPrompt: s.videoPrompt.instructions || null,
    audioSettings: {
      speaker:  s.narrationPrompt.speaker,
      emotion:  s.narrationPrompt.emotion,
      speed:    s.narrationPrompt.speed,
      ttsVoice:  s.narrationPrompt.ttsVoice,
      ttsStyle:  s.narrationPrompt.ttsStyle,
      ttsPacing: s.narrationPrompt.ttsPacing,
      ttsTone:   s.narrationPrompt.ttsTone,
    },
  };
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function ConteTool({
  storyboardId,
  workspaceId = null,
  workspaceName = null,
}: {
  storyboardId: string | null;
  workspaceId?: string | null;
  workspaceName?: string | null;
}) {
  const [scenes,               setScenes]               = useState<Scene[]>([]);
  const [loading,              setLoading]              = useState(false);
  const [addingScene,          setAddingScene]          = useState(false);
  const [generatingScriptIds,     setGeneratingScriptIds]     = useState<ReadonlySet<string>>(new Set());
  const [generatingTelopIds,      setGeneratingTelopIds]      = useState<ReadonlySet<string>>(new Set());
  const [generatingImageIds,      setGeneratingImageIds]      = useState<ReadonlySet<string>>(new Set());
  const [generatingVideoIds,      setGeneratingVideoIds]      = useState<ReadonlySet<string>>(new Set());
  const [generatingNarrationIds,  setGeneratingNarrationIds]  = useState<ReadonlySet<string>>(new Set());
  const [videoStatusMap,       setVideoStatusMap]       = useState<Record<string, string>>({});
  const [stepOpen,             setStepOpen]             = useState<OpenMap>({ script: true,  image: true,  video: true,  narration: true  });
  const [promptOpen,           setPromptOpen]           = useState<OpenMap>({ script: false, image: false, video: false, narration: false });
  const [wsSettingsOpen,       setWsSettingsOpen]       = useState(false);
  const [wsSettingsTab,        setWsSettingsTab]        = useState<WsSettingsTab>("image");
  const [dragSrcIdx,           setDragSrcIdx]           = useState<number | null>(null);
  const [dragOverIdx,          setDragOverIdx]          = useState<number | null>(null);

  const openWsSettings = (tab: WsSettingsTab) => { setWsSettingsTab(tab); setWsSettingsOpen(true); };

  const [genErrorMap, setGenErrorMap] = useState<Record<string, Record<string, string>>>({});

  const setGenError = useCallback((sceneId: string, type: string, msg: string | undefined) => {
    setGenErrorMap((m) => {
      const cur = { ...m[sceneId] };
      if (msg === undefined) delete cur[type]; else cur[type] = msg;
      return { ...m, [sceneId]: cur };
    });
  }, []);

  const saveTimers         = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const pollTimers         = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const pollCounters       = useRef<Map<string, number>>(new Map());
  const pollErrCounts      = useRef<Map<string, number>>(new Map());
  const videoPendingMeta   = useRef<Map<string, GenMetaVideo>>(new Map());

  useEffect(() => {
    for (const t of saveTimers.current.values()) clearTimeout(t);
    saveTimers.current.clear();
    if (!storyboardId) { setScenes([]); return; }
    setLoading(true);
    getStoryboard(storyboardId).then((res) => {
      if (res.ok && res.storyboard) {
        setScenes(res.storyboard.scenes.map((s, i) => dbSceneToLocal(s, i)));
      }
      setLoading(false);
    });
  }, [storyboardId]);

  const scheduleSave = useCallback((sceneId: string, patch: object) => {
    if (!storyboardId) return;
    const existing = saveTimers.current.get(sceneId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      updateScene(storyboardId, sceneId, patch as any);
      saveTimers.current.delete(sceneId);
    }, 1500);
    saveTimers.current.set(sceneId, t);
  }, [storyboardId]);

  const toggleStep = (k: StepKey) => {
    setStepOpen((o) => {
      const next = !o[k];
      if (!next) setPromptOpen((p) => ({ ...p, [k]: false }));
      return { ...o, [k]: next };
    });
  };
  const togglePrompt = (k: StepKey) => setPromptOpen((o) => ({ ...o, [k]: !o[k] }));

  const update = (id: string, patch: Partial<Scene>) => {
    setScenes((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const updated = { ...x, ...patch };
        scheduleSave(id, localSceneToDbPatch(updated));
        return updated;
      })
    );
  };

  const addScene = async (afterIdx: number) => {
    if (!storyboardId || addingScene) return;
    setAddingScene(true);
    const sceneNo = scenes.length + 1;
    const res = await createScene(storyboardId, { sceneNo, title: `シーン ${sceneNo}` });
    if (res.ok && res.scene) {
      const newScene = dbSceneToLocal(res.scene, scenes.length);
      setScenes((prev) => {
        const next = [...prev];
        next.splice(afterIdx + 1, 0, newScene);
        return next;
      });
    }
    setAddingScene(false);
  };

  const removeScene = async (id: string) => {
    if (!storyboardId) return;
    const timer = saveTimers.current.get(id);
    if (timer) { clearTimeout(timer); saveTimers.current.delete(id); }
    await deleteScene(storyboardId, id);
    setScenes((s) => s.filter((x) => x.id !== id));
  };

  const duplicateScene = async (srcId: string, afterIdx: number) => {
    if (!storyboardId || addingScene) return;
    const src = scenes.find((s) => s.id === srcId);
    if (!src) return;
    setAddingScene(true);
    const patch = localSceneToDbPatch(src);
    const res = await createScene(storyboardId, {
      ...patch,
      sceneNo: afterIdx + 2,
      title: src.title ? `${src.title}（コピー）` : `シーン ${afterIdx + 2}（コピー）`,
    });
    if (res.ok && res.scene) {
      const newScene = dbSceneToLocal(res.scene, afterIdx + 1);
      setScenes((prev) => {
        const next = [...prev];
        next.splice(afterIdx + 1, 0, newScene);
        return next;
      });
    }
    setAddingScene(false);
  };

  const handleDragStart = (idx: number) => setDragSrcIdx(idx);
  const handleDragOver  = (idx: number) => { if (dragSrcIdx !== null && dragSrcIdx !== idx) setDragOverIdx(idx); };
  const handleDragLeave = () => setDragOverIdx(null);
  const handleDragEnd   = () => { setDragSrcIdx(null); setDragOverIdx(null); };
  const handleDrop = async (dropIdx: number) => {
    const src = dragSrcIdx;
    setDragSrcIdx(null);
    setDragOverIdx(null);
    if (src === null || src === dropIdx) return;
    const next = [...scenes];
    const [moved] = next.splice(src, 1);
    next.splice(dropIdx, 0, moved);
    setScenes(next);
    if (storyboardId) {
      await Promise.all(next.map((s, i) => updateScene(storyboardId, s.id, { sceneNo: i + 1 })));
    }
  };

  const handleGenerateScript = async (sceneId: string, sourceText: string) => {
    if (!storyboardId || !sourceText.trim()) return;
    setGenError(sceneId, "script", undefined);
    setGeneratingScriptIds((prev) => new Set(prev).add(sceneId));
    try {
      const scriptSettings = loadScriptSettings();
      const res = await generateSceneScript(storyboardId, sceneId, {
        sourceText,
        model: scriptSettings.scriptModel,
        commonRules: scriptSettings.scriptCommonRules,
        negativePrompt: scriptSettings.scriptNegativePrompt,
      });
      if (res.ok && res.naText) {
        const t = saveTimers.current.get(sceneId);
        if (t) { clearTimeout(t); saveTimers.current.delete(sceneId); }
        setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, script: res.naText! } : s));
        updateScene(storyboardId, sceneId, { naText: res.naText });
      } else if (!res.ok) {
        setGenError(sceneId, "script", res.message ?? "台本生成に失敗しました");
      }
    } catch (e) {
      setGenError(sceneId, "script", `台本生成に失敗しました: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGeneratingScriptIds((prev) => { const next = new Set(prev); next.delete(sceneId); return next; });
    }
  };

  const handleGenerateTelop = async (sceneId: string, sourceText: string) => {
    if (!storyboardId || !sourceText.trim()) return;
    setGenError(sceneId, "telop", undefined);
    setGeneratingTelopIds((prev) => new Set(prev).add(sceneId));
    try {
      const telopSettings = loadTelopSettings();
      const res = await generateSceneTelopText(storyboardId, sceneId, {
        sourceText,
        model: telopSettings.telopModel,
        commonRules: telopSettings.telopCommonRules,
        negativePrompt: telopSettings.telopNegativePrompt,
      });
      if (res.ok && res.telopText) {
        const t = saveTimers.current.get(sceneId);
        if (t) { clearTimeout(t); saveTimers.current.delete(sceneId); }
        setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, telop: res.telopText! } : s));
        updateScene(storyboardId, sceneId, { telopText: res.telopText });
      } else if (!res.ok) {
        setGenError(sceneId, "telop", res.message ?? "テロップ生成に失敗しました");
      }
    } catch (e) {
      setGenError(sceneId, "telop", `テロップ生成に失敗しました: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGeneratingTelopIds((prev) => { const next = new Set(prev); next.delete(sceneId); return next; });
    }
  };

  const handleGenerateImage = async (sceneId: string, scene: Scene) => {
    if (!storyboardId) return;
    if (!scene.imagePrompt.sceneContent.trim() && !scene.imagePrompt.composition.trim()) {
      setGenError(sceneId, "image", "シーン内容または構図を入力してください");
      return;
    }
    setGenError(sceneId, "image", undefined);
    setGeneratingImageIds((prev) => new Set(prev).add(sceneId));
    try {
      const imgSettings = loadImageSettings();

      // 参照画像 URL を解決
      let refImgUrl: string | null = null;
      const mode = scene.imagePrompt.mode;
      if (mode === "ref-scene") {
        const refScene = scenes.find((s) => s.id === scene.imagePrompt.refSceneId);
        refImgUrl = refScene?.imageUrl ?? null;
        if (!refImgUrl) { setGenError(sceneId, "image", "参照シーンにまだ画像がありません。先にそのシーンの画像を生成してください。"); setGeneratingImageIds((p) => { const n = new Set(p); n.delete(sceneId); return n; }); return; }
      } else if (mode === "ref-template") {
        const tpl = getTemplateById(scene.imagePrompt.refTemplateId ?? "");
        refImgUrl = tpl?.sampleImageUrl ?? null;
      } else if (mode === "ref-file") {
        refImgUrl = scene.imagePrompt.refFileUrl ?? null;
      } else if (mode === "ref-upload") {
        refImgUrl = scene.imagePrompt.refUploadUrl ?? null;
      }

      // ワークスペース参照スタイルを fallback として使用（scene 参照がない場合）
      if (!refImgUrl && imgSettings.refStyle === "upload" && imgSettings.refImageUrl) {
        refImgUrl = imgSettings.refImageUrl;
      }

      const res = await generateSceneImage(storyboardId, sceneId, {
        style: mode === "text" ? "photo" : "photo",
        sceneContent: scene.imagePrompt.sceneContent,
        composition: scene.imagePrompt.composition,
        imgUrl: refImgUrl,
        imageModel: imgSettings.imageModel,
        aspectRatio: imgSettings.aspectRatio,
        version: imgSettings.version,
        testTimeScaling: imgSettings.testTimeScaling,
        upscaleFactor: imgSettings.upscaleFactor,
        removeBg: imgSettings.removeBg,
        fitImageMaxDim: imgSettings.fitImageMaxDim,
        sdAspectRatio: imgSettings.sdAspectRatio,
        sdResolution: imgSettings.sdResolution,
        sdOutputFormat: imgSettings.sdOutputFormat,
        sdWatermark: imgSettings.sdWatermark,
        sdOptimizePrompt: imgSettings.sdOptimizePrompt,
        imgCommonRules: imgSettings.imgCommonRules,
        imgNegativePrompt: imgSettings.imgNegativePrompt,
        googleAspectRatio: imgSettings.googleAspectRatio,
        googleOutputFormat: imgSettings.googleOutputFormat,
        googleQualityHint: imgSettings.googleQualityHint,
        googleThinkingLevel: imgSettings.googleThinkingLevel,
        gptSize: imgSettings.gptSize,
        gptQuality: imgSettings.gptQuality,
        gptBackground: imgSettings.gptBackground,
        gptCompression: imgSettings.gptCompression,
        gptModeration: imgSettings.gptModeration,
        gptOutputFormat: imgSettings.gptOutputFormat,
      });
      if (res.ok && res.imgUrl) {
        const m = imgSettings.imageModel ?? "reve-1";
        const ar = m === "seedream-5-0-pro" ? (imgSettings.sdAspectRatio ?? "16:9")
          : m.startsWith("google-") ? (imgSettings.googleAspectRatio ?? "16:9")
          : (imgSettings.aspectRatio ?? "16:9");
        saveGenMeta(res.imgUrl, {
          type: "ai-image",
          prompt: [scene.imagePrompt.sceneContent, scene.imagePrompt.composition].filter(Boolean).join("\n"),
          model: m,
          aspectRatio: ar,
        });
        const t = saveTimers.current.get(sceneId);
        if (t) { clearTimeout(t); saveTimers.current.delete(sceneId); }
        setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, imageUrl: res.imgUrl! } : s));
      } else if (!res.ok) {
        setGenError(sceneId, "image", res.message ?? "画像生成に失敗しました");
      }
    } catch (e) {
      setGenError(sceneId, "image", `画像生成に失敗しました: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGeneratingImageIds((prev) => { const next = new Set(prev); next.delete(sceneId); return next; });
    }
  };

  const stopVideoPolling = useCallback((sceneId: string) => {
    const iv = pollTimers.current.get(sceneId);
    if (iv) { clearInterval(iv); pollTimers.current.delete(sceneId); }
    pollCounters.current.delete(sceneId);
    pollErrCounts.current.delete(sceneId);
    setGeneratingVideoIds((prev) => { const n = new Set(prev); n.delete(sceneId); return n; });
  }, []);

  const startVideoPolling = useCallback((sceneId: string) => {
    if (pollTimers.current.has(sceneId)) return;
    pollCounters.current.set(sceneId, 0);
    pollErrCounts.current.set(sceneId, 0);
    const iv = setInterval(async () => {
      if (!storyboardId) return;

      // タイムアウト判定（最大180回 × 6秒 = 18分）
      const count = (pollCounters.current.get(sceneId) ?? 0) + 1;
      pollCounters.current.set(sceneId, count);
      if (count > 180) {
        stopVideoPolling(sceneId);
        setGenError(sceneId, "video", "動画生成がタイムアウトしました（18分以上経過）。再試行してください。");
        return;
      }

      try {
        const res = await pollVideoStatus(storyboardId, sceneId);
        pollErrCounts.current.set(sceneId, 0);
        const status = res.status ?? "unknown";
        setVideoStatusMap((m) => ({ ...m, [sceneId]: status }));
        if (status === "succeeded" && res.videoUrl) {
          stopVideoPolling(sceneId);
          const vMeta = videoPendingMeta.current.get(sceneId);
          if (vMeta) { saveGenMeta(res.videoUrl, vMeta); videoPendingMeta.current.delete(sceneId); }
          const newVideoUrl = res.videoUrl;
          setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, videoUrl: newVideoUrl, videoDuration: null } : s));
          getVideoDurationFromUrl(newVideoUrl).then((dur) => {
            if (dur != null) setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, videoDuration: dur } : s));
          }).catch(() => {});
        } else if (status === "failed" || status === "expired") {
          stopVideoPolling(sceneId);
          const raw = res.message ?? "動画生成に失敗しました";
          // RAI フィルタや既知エラーをわかりやすいメッセージに変換
          const msg = raw.includes("audio") && raw.includes("safety")
            ? "Googleのコンテンツフィルタにより動画が生成されませんでした。ワークスペース設定で「音声を生成」をオフにするか、プロンプトを変更して再試行してください。"
            : raw.includes("raiMedia") || raw.includes("content policy")
            ? "コンテンツポリシーにより動画がフィルタリングされました。プロンプトを変更して再試行してください。"
            : raw;
          setGenError(sceneId, "video", msg);
        }
      } catch (e) {
        const errCount = (pollErrCounts.current.get(sceneId) ?? 0) + 1;
        pollErrCounts.current.set(sceneId, errCount);
        if (errCount >= 4) {
          stopVideoPolling(sceneId);
          setGenError(sceneId, "video", "動画のステータス取得に連続して失敗しました。ネットワークを確認して再試行してください。");
        }
      }
    }, 6000);
    pollTimers.current.set(sceneId, iv);
  }, [storyboardId, stopVideoPolling]);

  const handleGenerateVideo = async (sceneId: string, scene: Scene) => {
    if (!storyboardId) return;
    if (!scene.videoPrompt.instructions.trim() && !scene.imageUrl) {
      setGenError(sceneId, "video", "プロンプトまたは画像が必要です");
      return;
    }
    setGenError(sceneId, "video", undefined);
    setGeneratingVideoIds((prev) => new Set(prev).add(sceneId));
    setVideoStatusMap((m) => ({ ...m, [sceneId]: "queued" }));
    try {
      const vidSettings = loadVideoSettings();
      const res = await generateSceneVideo(storyboardId, sceneId, {
        videoModel:       vidSettings.videoModel,
        instructions:     scene.videoPrompt.instructions,
        resolution:       vidSettings.resolution,
        ratio:            vidSettings.ratio,
        duration:         vidSettings.duration,
        generateAudio:    vidSettings.generateAudio,
        cameraFixed:        vidSettings.cameraFixed,
        watermark:          vidSettings.watermark,
        seed:               vidSettings.seed,
        personGeneration:   vidSettings.personGeneration,
        compressionQuality: vidSettings.compressionQuality,
        vidCommonRules:     vidSettings.vidCommonRules,
        vidNegativePrompt:  vidSettings.vidNegativePrompt,
      });
      if (!res.ok) {
        setGenError(sceneId, "video", res.message ?? "動画生成タスクの作成に失敗しました");
        setGeneratingVideoIds((prev) => { const n = new Set(prev); n.delete(sceneId); return n; });
        return;
      }
      videoPendingMeta.current.set(sceneId, {
        type: "ai-video",
        prompt: scene.videoPrompt.instructions,
        model: vidSettings.videoModel ?? "veo-3-lite",
        ratio: vidSettings.ratio ?? "16:9",
        duration: vidSettings.duration ?? 5,
        refImageUrl: scene.imageUrl ?? undefined,
      });
      startVideoPolling(sceneId);
    } catch (e) {
      setGenError(sceneId, "video", `動画生成に失敗しました: ${e instanceof Error ? e.message : e}`);
      setGeneratingVideoIds((prev) => { const n = new Set(prev); n.delete(sceneId); return n; });
    }
  };

  const handleGenerateNarration = async (sceneId: string, scene: Scene) => {
    if (!storyboardId) return;
    const transcript = (scene.script || scene.scriptPrompt.sourceText || "").trim();
    if (!transcript) {
      setGenError(sceneId, "narration", "台本テキストが必要です（STEP 01 台本生成を先に行ってください）");
      return;
    }

    const ws = loadTtsSettings();
    const effectiveVoice  = scene.narrationPrompt.ttsVoice  ?? ws.voice;
    const effectiveStyle  = scene.narrationPrompt.ttsStyle  ?? ws.style;
    const effectivePacing = scene.narrationPrompt.ttsPacing ?? ws.pacing;
    const effectiveTone   = scene.narrationPrompt.ttsTone   ?? ws.tone;

    setGenError(sceneId, "narration", undefined);
    setGeneratingNarrationIds((prev) => new Set(prev).add(sceneId));
    try {
      const res = await generateSceneNarration(storyboardId, sceneId, {
        transcript,
        provider:          ws.provider,
        model:             ws.model,
        voice:             effectiveVoice,
        style:             effectiveStyle,
        pacing:            effectivePacing,
        tone:              effectiveTone,
        accent:            ws.accent,
        autoChunk:         ws.autoChunk,
        maxChunkLength:    ws.maxChunkLength,
        retryCount:        ws.retryCount,
        ttsCommonRules:    ws.ttsCommonRules,
        ttsNegativePrompt: ws.ttsNegativePrompt,
      });
      if (res.ok && res.audioUrl) {
        saveGenMeta(res.audioUrl, {
          type: "ai-narration",
          transcript,
          voice: effectiveVoice,
          pacing: effectivePacing ?? "",
          tone: effectiveTone ?? "",
        });
        const t = saveTimers.current.get(sceneId);
        if (t) { clearTimeout(t); saveTimers.current.delete(sceneId); }
        setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, narrationUrl: res.audioUrl!, narrationName: transcript, narrationDuration: res.audioDuration ?? null } : s));
      } else {
        setGenError(sceneId, "narration", res.message ?? "ナレーション生成に失敗しました");
      }
    } catch (e) {
      setGenError(sceneId, "narration", `ナレーション生成に失敗しました: ${e instanceof Error ? e.message : e}`);
    } finally {
      setGeneratingNarrationIds((prev) => { const n = new Set(prev); n.delete(sceneId); return n; });
    }
  };

  if (!storyboardId) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF", fontFamily: FONT }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#94a3b8", fontSize: 14, margin: "0 0 6px" }}>コンテを選択してください</p>
          <p style={{ color: "#cbd5e1", fontSize: 12, margin: 0 }}>左のパネルからコンテを選択または作成してください</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#FFFFFF" }}>
        <p style={{ color: "#94a3b8", fontSize: 14, fontFamily: FONT }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <>
    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden", background: "#FFFFFF", fontFamily: FONT, position: "relative" }}>
      {/* ローディングバー */}
      {addingScene && (
        <>
          <style>{`@keyframes conte-bar{0%{left:-60%}100%{left:110%}}@keyframes sk-pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, overflow: "hidden", zIndex: 20, background: `${CYAN}20` }}>
            <div style={{ position: "absolute", top: 0, height: "100%", width: "55%", background: `linear-gradient(90deg,transparent,${CYAN},${PURPLE},transparent)`, animation: "conte-bar 1s ease infinite" }} />
          </div>
        </>
      )}
      <div style={{ flex: 1, overflowX: "auto", overflowY: "auto", padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
        {scenes.length === 0 && !addingScene ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <button
              onClick={() => addScene(-1)}
              style={{ padding: "10px 28px", fontSize: 13, fontWeight: 700, borderRadius: 99, border: `1.5px solid ${CYAN}`, background: "transparent", color: CYAN, cursor: "pointer", fontFamily: FONT }}
            >
              + 最初のシーンを追加
            </button>
          </div>
        ) : (
          <>
            {scenes.map((scene, i) => (
              <SceneCol
                key={scene.id}
                scene={scene}
                index={i}
                allScenes={scenes}
                stepOpen={stepOpen}
                promptOpen={promptOpen}
                onToggleStep={toggleStep}
                onTogglePrompt={togglePrompt}
                onUpdate={(p) => update(scene.id, p)}
                onDelete={() => removeScene(scene.id)}
                onAddAfter={() => addScene(i)}
                onDuplicate={() => duplicateScene(scene.id, i)}
                onGenerateScript={(src) => handleGenerateScript(scene.id, src)}
                generatingScript={generatingScriptIds.has(scene.id)}
                onGenerateTelop={(src) => handleGenerateTelop(scene.id, src)}
                generatingTelop={generatingTelopIds.has(scene.id)}
                onGenerateImage={() => handleGenerateImage(scene.id, scene)}
                generatingImage={generatingImageIds.has(scene.id)}
                onGenerateVideo={() => handleGenerateVideo(scene.id, scene)}
                generatingVideo={generatingVideoIds.has(scene.id)}
                videoStatus={videoStatusMap[scene.id] ?? ""}
                onGenerateNarration={() => handleGenerateNarration(scene.id, scene)}
                generatingNarration={generatingNarrationIds.has(scene.id)}
                genErrors={genErrorMap[scene.id] ?? {}}
                onOpenSettings={openWsSettings}
                workspaceId={workspaceId}
                isDragging={dragSrcIdx === i}
                isDragOver={dragOverIdx === i}
                onDragStart={() => handleDragStart(i)}
                onDragOver={() => handleDragOver(i)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(i)}
                onDragEnd={handleDragEnd}
              />
            ))}
            {addingScene && <SceneColSkeleton />}
          </>
        )}
      </div>
    </div>

    {wsSettingsOpen && (
      <WorkspaceSettingsModal
        defaultTab={wsSettingsTab}
        workspaceId={workspaceId ?? undefined}
        workspaceName={workspaceName ?? undefined}
        onClose={() => setWsSettingsOpen(false)}
      />
    )}
    </>
  );
}

// ─── Video duration helpers ───────────────────────────────────────────────────

function getVideoDurationFromFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dur = video.duration;
      resolve(isFinite(dur) && dur > 0 ? Math.round(dur * 100) / 100 : null);
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });
}

function getVideoDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const dur = video.duration;
      resolve(isFinite(dur) && dur > 0 ? Math.round(dur * 100) / 100 : null);
    };
    video.onerror = () => resolve(null);
    video.src = url;
  });
}

function getAudioDurationFromFile(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const dur = audio.duration;
      resolve(isFinite(dur) && dur > 0 ? Math.round(dur * 100) / 100 : null);
    };
    audio.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    audio.src = url;
  });
}

// ─── Scene Column Skeleton ────────────────────────────────────────────────────

function SceneColSkeleton() {
  return (
    <div style={{ width: 248, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ height: 20, width: "60%", background: "#e8edf2", borderRadius: 6, animation: "sk-pulse 1.2s ease infinite" }} />
      <div style={{ height: 14, width: "80%", background: "#eef1f5", borderRadius: 6, animation: "sk-pulse 1.2s ease infinite 0.1s" }} />
      {[0, 1, 2, 3].map((n) => (
        <div key={n} style={{ height: 120, background: "#f0f4f8", borderRadius: 10, animation: `sk-pulse 1.2s ease infinite ${n * 0.08}s` }} />
      ))}
    </div>
  );
}

// ─── Template Picker Modal ───────────────────────────────────────────────────

function TemplatePickerModal({ current, onSelect, onClose }: {
  current: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, width: 560, maxWidth: "95vw", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: FONT }}>スタイルテンプレートを選択</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {IMAGE_STYLE_TEMPLATES.map((tpl) => {
            const isCurrent = tpl.id === current;
            return (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl.id)}
                style={{
                  textAlign: "left", padding: 0, borderRadius: 10,
                  border: `1.5px solid ${isCurrent ? CYAN : "#e2e8f0"}`,
                  background: isCurrent ? `${CYAN}10` : "#fff",
                  cursor: "pointer", fontFamily: FONT, overflow: "hidden",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => { if (!isCurrent) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}}
                onMouseLeave={(e) => { if (!isCurrent) { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; (e.currentTarget as HTMLButtonElement).style.background = isCurrent ? `${CYAN}10` : "#fff"; }}}
              >
                <div style={{ width: "100%", aspectRatio: "16/9", overflow: "hidden", position: "relative" }}>
                  <img src={tpl.sampleImageUrl} alt={tpl.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  {isCurrent && (
                    <div style={{ position: "absolute", top: 5, right: 5, width: 18, height: 18, borderRadius: "50%", background: CYAN, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M1.5 5l3 3 4-4"/></svg>
                    </div>
                  )}
                </div>
                <div style={{ padding: "7px 10px 8px" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? CYAN : "#1e293b", marginBottom: 2 }}>{tpl.name}</div>
                  <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.4 }}>{tpl.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── File Browser Modal ───────────────────────────────────────────────────────

function FileBrowserModal({ workspaceId, current, fileType = "image", title, onSelect, onClose }: {
  workspaceId?: string | null;
  current: string | null;
  fileType?: "image" | "video" | "audio";
  title?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [files, setFiles] = useState<Array<{ id: string; fileUrl: string; fileName: string; fileType: string }>>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  useEffect(() => {
    setLoadingFiles(true);
    getMyFiles(undefined, workspaceId).then((res: { ok: boolean; files?: Array<{ id: string; fileUrl: string; fileName: string; fileType: string }> }) => {
      setFiles((res.files ?? []).filter((f) => f.fileType === fileType));
      setLoadingFiles(false);
    });
  }, [workspaceId, fileType]);

  const emptyLabel = fileType === "video" ? "アップロード済みの動画がありません" : fileType === "audio" ? "アップロード済みの音声がありません" : "アップロード済みの画像がありません";
  const modalTitle = title ?? (fileType === "video" ? "動画を選択" : fileType === "audio" ? "音声を選択" : "ファイルから参照");

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: 14, width: 520, maxWidth: "95vw", maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.18)", overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#1e293b", fontFamily: FONT }}>{modalTitle}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#94a3b8", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ overflowY: "auto", padding: 16 }}>
          {loadingFiles ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "24px 0", fontFamily: FONT }}>読み込み中...</div>
          ) : files.length === 0 ? (
            <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "24px 0", fontFamily: FONT }}>{emptyLabel}</div>
          ) : fileType === "image" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {files.map((f) => {
                const isSelected = f.fileUrl === current;
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelect(f.fileUrl)}
                    style={{ padding: 0, border: `2px solid ${isSelected ? CYAN : "#e2e8f0"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", background: isSelected ? `${CYAN}10` : "#fff", display: "flex", flexDirection: "column", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; }}
                  >
                    <div style={{ position: "relative", paddingBottom: "75%", background: "#f8fafc", width: "100%" }}>
                      <img src={f.fileUrl} alt={f.fileName} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                    <div style={{ padding: "4px 6px", fontSize: 9, color: "#64748b", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{f.fileName}</div>
                  </button>
                );
              })}
            </div>
          ) : fileType === "video" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {files.map((f) => {
                const isSelected = f.fileUrl === current;
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelect(f.fileUrl)}
                    style={{ padding: 0, border: `2px solid ${isSelected ? CYAN : "#e2e8f0"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", background: isSelected ? `${CYAN}10` : "#000", display: "flex", flexDirection: "column", transition: "border-color 0.15s" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; }}
                  >
                    <div style={{ position: "relative", paddingBottom: "56.25%", background: "#0a0a0a", width: "100%" }}>
                      <video
                        src={f.fileUrl}
                        preload="metadata"
                        muted
                        playsInline
                        onLoadedMetadata={(e) => { (e.currentTarget as HTMLVideoElement).currentTime = 0.1; }}
                        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div style={{ padding: "4px 6px", fontSize: 9, color: "#64748b", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left", background: "#fff" }}>{f.fileName}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {files.map((f) => {
                const isSelected = f.fileUrl === current;
                return (
                  <button
                    key={f.id}
                    onClick={() => onSelect(f.fileUrl)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", border: `2px solid ${isSelected ? CYAN : "#e2e8f0"}`, borderRadius: 8, cursor: "pointer", background: isSelected ? `${CYAN}10` : "#fff", transition: "border-color 0.15s", textAlign: "left" }}
                    onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#cbd5e1"; }}
                    onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLButtonElement).style.borderColor = "#e2e8f0"; }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>🎵</span>
                    <span style={{ fontSize: 12, color: "#334155", fontFamily: FONT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.fileName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Upload source dropdown ───────────────────────────────────────────────────

function UploadSourceDropdown({ onPc, onFile, onClose }: { onPc: () => void; onFile: () => void; onClose: () => void }) {
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 200, background: "#fff", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.13)", border: "1px solid #e2e8f0", minWidth: 160, overflow: "hidden" }}>
        {([
          { label: "PCからアップロード", icon: <PcUploadIcon />, action: onPc },
          { label: "ファイルから選ぶ",   icon: <FolderIcon />,   action: onFile },
        ] as const).map(({ label, icon, action }) => (
          <button
            key={label}
            onClick={() => { action(); onClose(); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#334155", fontFamily: FONT, textAlign: "left" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
          >
            {icon}{label}
          </button>
        ))}
      </div>
    </>
  );
}

function PcUploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M12 7v6M9 10l3-3 3 3" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8C3 6.9 3.9 6 5 6H10.17L12.17 8H19C20.1 8 21 8.9 21 10V18C21 19.1 20.1 20 19 20H5C3.9 20 3 19.1 3 18V8Z" />
    </svg>
  );
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ marginTop: 5, padding: "6px 10px", borderRadius: 7, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "flex-start", gap: 6 }}>
      <span style={{ color: "#ef4444", fontSize: 13, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>⚠</span>
      <span style={{ fontSize: 10, color: "#b91c1c", lineHeight: 1.55, fontFamily: FONT, wordBreak: "break-all" }}>{message}</span>
    </div>
  );
}

// ─── Scene Column ─────────────────────────────────────────────────────────────

function SceneCol({ scene, index, allScenes, stepOpen, promptOpen, onToggleStep, onTogglePrompt, onUpdate, onDelete, onAddAfter, onDuplicate, onGenerateScript, generatingScript, onGenerateTelop, generatingTelop, onGenerateImage, generatingImage, onGenerateVideo, generatingVideo, videoStatus, onGenerateNarration, generatingNarration, genErrors, onOpenSettings, workspaceId, isDragging, isDragOver, onDragStart, onDragOver, onDragLeave, onDrop, onDragEnd }: {
  scene: Scene;
  index: number;
  allScenes: Scene[];
  stepOpen: OpenMap;
  promptOpen: OpenMap;
  onToggleStep: (k: StepKey) => void;
  onTogglePrompt: (k: StepKey) => void;
  onUpdate: (p: Partial<Scene>) => void;
  onDelete: () => void;
  onAddAfter: () => void;
  onDuplicate: () => void;
  onGenerateScript: (sourceText: string) => void;
  generatingScript: boolean;
  onGenerateTelop: (sourceText: string) => void;
  generatingTelop: boolean;
  onGenerateImage: () => void;
  generatingImage: boolean;
  onGenerateVideo: () => void;
  generatingVideo: boolean;
  videoStatus: string;
  onGenerateNarration: () => void;
  generatingNarration: boolean;
  genErrors: Record<string, string>;
  onOpenSettings: (tab: WsSettingsTab) => void;
  workspaceId?: string | null;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const imgUploadRef    = useRef<HTMLInputElement>(null);
  const refUploadRef    = useRef<HTMLInputElement>(null);
  const videoUploadRef  = useRef<HTMLInputElement>(null);
  const audioUploadRef  = useRef<HTMLInputElement>(null);
  const [uploadingImg,      setUploadingImg]       = useState(false);
  const [uploadingRefImg,   setUploadingRefImg]    = useState(false);
  const [uploadingVideo,    setUploadingVideo]     = useState(false);
  const [uploadingAudio,    setUploadingAudio]     = useState(false);
  const [refDropdownOpen,   setRefDropdownOpen]    = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [fileBrowserOpen,    setFileBrowserOpen]    = useState(false);
  const [imgUploadPickerOpen,   setImgUploadPickerOpen]   = useState(false);
  const [videoUploadPickerOpen, setVideoUploadPickerOpen] = useState(false);
  const [audioUploadPickerOpen, setAudioUploadPickerOpen] = useState(false);
  const [imgUploadBrowserOpen,   setImgUploadBrowserOpen]   = useState(false);
  const [videoUploadBrowserOpen, setVideoUploadBrowserOpen] = useState(false);
  const [audioUploadBrowserOpen, setAudioUploadBrowserOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ type: "image" | "video"; url: string } | null>(null);

  const handleImgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = checkUploadLimit(file, "image");
    if (err) { alert(err); e.target.value = ""; return; }
    setUploadingImg(true);
    try {
      const data = await getPresignedUrl(file, undefined, workspaceId);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードに失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error("upload failed")));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      if (data.fileUrl) onUpdate({ imageUrl: data.fileUrl });
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  const handleRefUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = checkUploadLimit(file, "image");
    if (err) { alert(err); e.target.value = ""; return; }
    setUploadingRefImg(true);
    try {
      const data = await getPresignedUrl(file, undefined, workspaceId);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードに失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error("upload failed")));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      if (data.fileUrl) onUpdate({ imagePrompt: { ...scene.imagePrompt, mode: "ref-upload", refUploadUrl: data.fileUrl } });
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setUploadingRefImg(false);
      e.target.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = checkUploadLimit(file, "video");
    if (err) { alert(err); e.target.value = ""; return; }
    setUploadingVideo(true);
    try {
      const data = await getPresignedUrl(file, undefined, workspaceId);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードに失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error("upload failed")));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      if (data.fileUrl) {
        const dur = await getVideoDurationFromFile(file).catch(() => null);
        onUpdate({ videoUrl: data.fileUrl, videoDuration: dur });
      }
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setUploadingVideo(false);
      e.target.value = "";
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = checkUploadLimit(file, "audio");
    if (err) { alert(err); e.target.value = ""; return; }
    setUploadingAudio(true);
    try {
      const data = await getPresignedUrl(file, undefined, workspaceId);
      if (!data.ok || !data.presignedUrl) { alert(data.message ?? "アップロードに失敗しました"); return; }
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error("upload failed")));
        xhr.onerror = () => reject(new Error("network error"));
        xhr.open("PUT", data.presignedUrl!);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });
      if (data.fileUrl) {
        const name = file.name.replace(/\.[^.]+$/, "");
        const dur = await getAudioDurationFromFile(file).catch(() => null);
        onUpdate({ narrationUrl: data.fileUrl, narrationName: name, narrationDuration: dur });
      }
    } catch {
      alert("アップロードに失敗しました");
    } finally {
      setUploadingAudio(false);
      e.target.value = "";
    }
  };

  const imgSettings = loadImageSettings();
  const vidSettings = loadVideoSettings();
  const imgRatio = imgSettings.imageModel === "reve-1"
    ? imgSettings.aspectRatio
    : imgSettings.imageModel === "seedream-5-0-pro"
    ? imgSettings.sdAspectRatio
    : imgSettings.googleAspectRatio;
  const vidRatio = vidSettings.ratio === "adaptive" ? "16:9" : vidSettings.ratio;
  const imgPct = ratioPct(imgRatio);
  const vidPct = ratioPct(vidRatio);

  return (
    <>
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(); }}
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      onDragEnd={onDragEnd}
      style={{ width: 248, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4,
        opacity: isDragging ? 0.35 : 1,
        outline: isDragOver ? `2px solid ${CYAN}` : "none",
        outlineOffset: 4,
        borderRadius: 14,
        transition: "opacity 0.15s, outline 0.1s",
      }}>

      {/* Col header */}
      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 2px 6px" }}>
        {/* Drag handle */}
        <div style={{ cursor: "grab", color: "#cbd5e1", display: "flex", alignItems: "center", flexShrink: 0 }} title="ドラッグして並び替え">
          <DragHandleIcon />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#475569", letterSpacing: "0.05em" }}># {index + 1}</span>
        <div style={{ flex: 1 }} />
        <ColIconBtn onClick={onDuplicate} title="シーンを複製"><DuplicateIcon size={13} /></ColIconBtn>
        <ColIconBtn onClick={onDelete} title="シーンを削除"><TrashIcon size={13} /></ColIconBtn>
        <ColIconBtn onClick={onAddAfter} title="後ろにシーン追加"><PlusIcon size={13} /></ColIconBtn>
      </div>

      {/* Title */}
      <input
        value={scene.title}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="タイトル"
        style={{ width: "100%", border: "none", background: "transparent", fontSize: 13, fontWeight: 700, color: "#1e293b", padding: "1px 2px 8px", outline: "none", fontFamily: FONT, borderBottom: "1px solid #e2e8f0" }}
      />

      <div style={{ height: 6 }} />

      {/* STEP 01 台本生成 */}
      <Step
        label="STEP 01 台本生成"
        icon={<DocIcon />}
        stepOpen={stepOpen.script}
        promptOpen={promptOpen.script}
        onToggleStep={() => onToggleStep("script")}
        onTogglePrompt={() => onTogglePrompt("script")}
        onOpenSettings={() => onOpenSettings("script")}
        gradient={GRAD_NOMAL}
        color={CYAN}
        promptSlot={
          <>
            <PromptCard>
              <DarkBadge>元情報</DarkBadge>
              <div style={{ height: 8 }} />
              <PromptTA
                value={scene.scriptPrompt.sourceText}
                onChange={(v) => onUpdate({ scriptPrompt: { ...scene.scriptPrompt, sourceText: v } })}
                placeholder="元となる原稿・テキストを貼り付けてください"
                rows={5}
              />
            </PromptCard>
            <GenButton
              color={CYAN}
              gradient={GRAD_BLUE}
              label="AI台本生成"
              loading={generatingScript}
              loadingLabel="台本生成中"
              disabled={!scene.scriptPrompt.sourceText.trim()}
              onClick={() => onGenerateScript(scene.scriptPrompt.sourceText)}
            />
            {generatingScript && (
              <GenStatusBadge label="Claude AI がナレーション台本を生成中..." state="processing" color={CYAN} />
            )}
            {!generatingScript && genErrors.script && <ErrorBanner message={genErrors.script} />}
          </>
        }
      >
        <OutputCard>
          <CardRow>
            <ColorBadge color={GRAD_BLUE} onClick={() => onTogglePrompt("script")}>AI台本</ColorBadge>
          </CardRow>
          <textarea
            value={scene.script}
            onChange={(e) => onUpdate({ script: e.target.value })}
            placeholder="台本テキストを入力..."
            rows={4}
            style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", resize: "none", overflowY: "auto", fontSize: 12, color: "#334155", fontFamily: FONT, outline: "none", padding: "8px 10px", lineHeight: 1.7 }}
          />
          {/* AI テロップ生成ボタン＋フィールド：プロンプト展開時のみ表示 */}
          <div style={{ display: "grid", gridTemplateRows: promptOpen.script ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
            <div style={{ overflow: "hidden", minHeight: 0 }}>
              <div style={{ paddingTop: 6 }}>
                <GenButton
                  color={CYAN}
                  gradient={GRAD_BLUE}
                  label="AI テロップ生成"
                  loading={generatingTelop}
                  loadingLabel="テロップ生成中"
                  disabled={!scene.scriptPrompt.sourceText.trim()}
                  onClick={() => onGenerateTelop(scene.scriptPrompt.sourceText)}
                />
                {generatingTelop && (
                  <GenStatusBadge label="Claude AI がテロップを生成中..." state="processing" color={CYAN} />
                )}
                {!generatingTelop && genErrors.telop && <ErrorBanner message={genErrors.telop} />}
                <div style={{ height: 6 }} />
                <CardRow>
                  <ColorBadge color={GRAD_BLUE} onClick={() => onTogglePrompt("script")}>AI テロップ</ColorBadge>
                </CardRow>
                <textarea
                  value={scene.telop}
                  onChange={(e) => onUpdate({ telop: e.target.value })}
                  placeholder="テロップテキストを入力..."
                  rows={2}
                  style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, background: "#fff", resize: "none", overflowY: "auto", fontSize: 12, color: "#334155", fontFamily: FONT, outline: "none", padding: "8px 10px", lineHeight: 1.7 }}
                />
              </div>
            </div>
          </div>
        </OutputCard>
      </Step>

      {/* STEP 02 画像生成 */}
      <Step
        label="STEP 02 画像生成"
        icon={<ImgIcon />}
        stepOpen={stepOpen.image}
        promptOpen={promptOpen.image}
        onToggleStep={() => onToggleStep("image")}
        onTogglePrompt={() => onTogglePrompt("image")}
        onOpenSettings={() => onOpenSettings("image")}
        gradient={GRAD_NOMAL}
        color={CYAN}
        promptSlot={
          <>
            <PromptCard>
              {/* 生成方法選択 */}
              <DarkBadge>生成方法</DarkBadge>
              <div style={{ height: 8 }} />
              {/* 生成方法選択ボタン ＋ 参照ドロップダウン */}
              <div style={{ display: "flex", gap: 5, position: "relative" }}>
                <button
                  onClick={() => { onUpdate({ imagePrompt: { ...scene.imagePrompt, mode: "text" } }); setRefDropdownOpen(false); }}
                  style={{
                    flex: 1, fontSize: 11, padding: "5px 4px", borderRadius: 7,
                    border: `1.5px solid ${scene.imagePrompt.mode === "text" ? CYAN : "#e2e8f0"}`,
                    background: scene.imagePrompt.mode === "text" ? `${CYAN}18` : "#fff",
                    color: scene.imagePrompt.mode === "text" ? CYAN : "#64748b",
                    cursor: "pointer", fontFamily: FONT,
                    fontWeight: scene.imagePrompt.mode === "text" ? 700 : 400,
                  }}
                >テキストから生成</button>

                <div style={{ flex: 1 }}>
                  <button
                    onClick={() => setRefDropdownOpen((o) => !o)}
                    style={{
                      width: "100%", fontSize: 11, padding: "5px 2px", borderRadius: 7,
                      border: `1.5px solid ${scene.imagePrompt.mode !== "text" ? CYAN : "#e2e8f0"}`,
                      background: scene.imagePrompt.mode !== "text" ? `${CYAN}18` : "#fff",
                      color: scene.imagePrompt.mode !== "text" ? CYAN : "#64748b",
                      cursor: "pointer", fontFamily: FONT,
                      fontWeight: scene.imagePrompt.mode !== "text" ? 700 : 400,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                    }}
                  >参照して生成 <span style={{ fontSize: 8, lineHeight: 1 }}>▼</span></button>
                </div>

                {/* ドロップダウン（参照画像プレビュー＋選択肢＋サブコントロール） */}
                {refDropdownOpen && (() => {
                  const prevImg =
                    scene.imagePrompt.mode === "ref-scene"
                      ? (allScenes.find((s) => s.id === scene.imagePrompt.refSceneId)?.imageUrl ?? null)
                      : scene.imagePrompt.mode === "ref-file"   ? scene.imagePrompt.refFileUrl
                      : scene.imagePrompt.mode === "ref-upload" ? scene.imagePrompt.refUploadUrl
                      : null;
                  const prevTpl = scene.imagePrompt.mode === "ref-template"
                    ? getTemplateById(scene.imagePrompt.refTemplateId ?? "")
                    : null;
                  const hasPreview = !!prevImg || !!prevTpl;

                  return (
                    <>
                      <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setRefDropdownOpen(false)} />
                      <div style={{ position: "absolute", top: "calc(100% + 3px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.13)", zIndex: 200, overflow: "hidden" }}>

                        {/* 参照中プレビュー */}
                        {prevImg && (
                          <div style={{ position: "relative" }}>
                            <img src={prevImg} alt="参照中" style={{ width: "100%", height: 86, objectFit: "cover", display: "block" }} />
                            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0) 55%)" }} />
                            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px 10px", display: "flex", alignItems: "center", gap: 5 }}>
                              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4.5 7.5l-2.8 2.8M7.5 4.5l2.8-2.8M3.5 8.5l4-4"/>
                                <circle cx="9.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="9.5" r="1.5"/>
                              </svg>
                              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.92)", fontFamily: FONT, fontWeight: 700 }}>参照中</span>
                            </div>
                          </div>
                        )}
                        {prevTpl && !prevImg && (
                          <div style={{ padding: "8px 10px", background: `${CYAN}09`, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 6 }}>
                            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={CYAN} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="4" cy="4" r="1.8"/><circle cx="10" cy="4" r="1.8"/><circle cx="4" cy="10" r="1.8"/><circle cx="10" cy="10" r="1.8"/>
                            </svg>
                            <span style={{ fontSize: 10, fontWeight: 700, color: CYAN, fontFamily: FONT }}>{prevTpl.name}</span>
                          </div>
                        )}

                        {/* 選択肢 + アクティブモードのサブコントロール */}
                        {([
                          ["ref-scene",    "別のシーンを参照"],
                          ["ref-template", "スタイルテンプレート"],
                          ["ref-file",     "ファイルから参照"],
                          ["ref-upload",   "画像をアップロード"],
                        ] as const).map(([m, lbl], idx) => {
                          const isActive = scene.imagePrompt.mode === m;
                          return (
                            <div key={m}>
                              <button
                                onClick={() => {
                                  if (!isActive) onUpdate({ imagePrompt: { ...scene.imagePrompt, mode: m } });
                                  if (m === "ref-upload" && !scene.imagePrompt.refUploadUrl) refUploadRef.current?.click();
                                }}
                                style={{
                                  display: "flex", alignItems: "center", gap: 7,
                                  width: "100%", textAlign: "left", padding: "8px 10px",
                                  fontSize: 11,
                                  color: isActive ? CYAN : "#475569",
                                  fontWeight: isActive ? 700 : 400,
                                  background: isActive ? `${CYAN}09` : "none",
                                  border: "none",
                                  borderTop: (idx === 0 && hasPreview) || idx > 0 ? "1px solid #f1f5f9" : "none",
                                  cursor: "pointer", fontFamily: FONT,
                                }}
                                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isActive ? `${CYAN}12` : "#f8fafc"; }}
                                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isActive ? `${CYAN}09` : "none"; }}
                              >
                                <span style={{ width: 10, flexShrink: 0, display: "flex" }}>
                                  {isActive && (
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={CYAN} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M1.5 5l2.5 2.5 4.5-5"/>
                                    </svg>
                                  )}
                                </span>
                                {lbl}
                              </button>

                              {isActive && m === "ref-scene" && (
                                <div style={{ padding: "4px 10px 8px 27px" }}>
                                  <select
                                    value={scene.imagePrompt.refSceneId ?? ""}
                                    onChange={(e) => onUpdate({ imagePrompt: { ...scene.imagePrompt, refSceneId: e.target.value || null } })}
                                    style={{ width: "100%", fontSize: 10, padding: "4px 6px", borderRadius: 5, border: "1px solid #e2e8f0", outline: "none", fontFamily: FONT, color: "#475569", background: "#fff", cursor: "pointer" }}
                                  >
                                    <option value="">シーンを選択...</option>
                                    {allScenes.filter((s) => s.id !== scene.id && s.imageUrl).map((s, si) => (
                                      <option key={s.id} value={s.id}>{s.title || `シーン ${si + 1}`}</option>
                                    ))}
                                  </select>
                                </div>
                              )}
                              {isActive && m === "ref-template" && (
                                <div style={{ padding: "4px 10px 8px 27px", display: "flex", gap: 4 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setTemplatePickerOpen(true); setRefDropdownOpen(false); }}
                                    style={{ flex: 1, fontSize: 10, padding: "3px 6px", borderRadius: 5, border: `1px solid ${CYAN}`, background: "transparent", color: CYAN, cursor: "pointer", fontFamily: FONT }}
                                  >{scene.imagePrompt.refTemplateId ? "テンプレートを変更" : "テンプレートを選択..."}</button>
                                  {scene.imagePrompt.refTemplateId && (
                                    <button onClick={(e) => { e.stopPropagation(); onUpdate({ imagePrompt: { ...scene.imagePrompt, refTemplateId: null } }); }} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: FONT }}>×</button>
                                  )}
                                </div>
                              )}
                              {isActive && m === "ref-file" && (
                                <div style={{ padding: "4px 10px 8px 27px", display: "flex", gap: 4 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setFileBrowserOpen(true); setRefDropdownOpen(false); }}
                                    style={{ flex: 1, fontSize: 10, padding: "3px 6px", borderRadius: 5, border: `1px solid ${CYAN}`, background: "transparent", color: CYAN, cursor: "pointer", fontFamily: FONT }}
                                  >{scene.imagePrompt.refFileUrl ? "ファイルを変更" : "ファイルを選択..."}</button>
                                  {scene.imagePrompt.refFileUrl && (
                                    <button onClick={(e) => { e.stopPropagation(); onUpdate({ imagePrompt: { ...scene.imagePrompt, refFileUrl: null } }); }} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: FONT }}>×</button>
                                  )}
                                </div>
                              )}
                              {isActive && m === "ref-upload" && (
                                <div style={{ padding: "4px 10px 8px 27px", display: "flex", gap: 4 }}>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (!uploadingRefImg) refUploadRef.current?.click(); }}
                                    style={{ flex: 1, fontSize: 10, padding: "3px 6px", borderRadius: 5, border: `1px solid ${uploadingRefImg ? "#e2e8f0" : CYAN}`, background: "transparent", color: uploadingRefImg ? "#cbd5e1" : CYAN, cursor: uploadingRefImg ? "not-allowed" : "pointer", fontFamily: FONT }}
                                  >{uploadingRefImg ? "アップロード中..." : scene.imagePrompt.refUploadUrl ? "画像を変更" : "画像をアップロード..."}</button>
                                  {scene.imagePrompt.refUploadUrl && !uploadingRefImg && (
                                    <button onClick={(e) => { e.stopPropagation(); onUpdate({ imagePrompt: { ...scene.imagePrompt, refUploadUrl: null } }); }} style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: FONT }}>×</button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              <input ref={refUploadRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleRefUpload} />

              <div style={{ height: 10 }} />
              <PromptSection label="シーン内容・状態" hint="このシーンで「何が起きているか」を記入してください。登場人物・表情・動き・感情・状況などを具体的に書くと、よりイメージに近い画像が生成されます。">
                <PromptTA
                  value={scene.imagePrompt.sceneContent}
                  onChange={(v) => onUpdate({ imagePrompt: { ...scene.imagePrompt, sceneContent: v } })}
                  placeholder="例: 若いビジネスマンがPCに向かって集中している"
                  rows={3}
                />
              </PromptSection>
              <div style={{ height: 10 }} />
              <PromptSection label="構図・アングル・配置" hint="このシーンを「どのように見せるか」を記入してください。カメラ位置・距離・アングル・被写体の配置などを指定すると、構図が安定します。">
                <PromptTA
                  value={scene.imagePrompt.composition}
                  onChange={(v) => onUpdate({ imagePrompt: { ...scene.imagePrompt, composition: v } })}
                  placeholder="例: 正面からのミディアムショット、背景はオフィス"
                  rows={3}
                />
              </PromptSection>
            </PromptCard>
            <GenButton
              color={CYAN}
              gradient={GRAD_BLUE}
              label="AI画像生成"
              loading={generatingImage}
              loadingLabel="画像生成中"
              disabled={!scene.imagePrompt.sceneContent.trim() && !scene.imagePrompt.composition.trim()}
              onClick={onGenerateImage}
            />
            {generatingImage && (
              <GenStatusBadge label={`AI が画像を生成中（${imageTimeEstimate(imgSettings.imageModel, imgSettings.testTimeScaling)}）...`} state="processing" color={CYAN} />
            )}
            {!generatingImage && genErrors.image && <ErrorBanner message={genErrors.image} />}

            {/* テンプレートピッカー */}
            {templatePickerOpen && (
              <TemplatePickerModal
                current={scene.imagePrompt.refTemplateId ?? null}
                onSelect={(id) => { onUpdate({ imagePrompt: { ...scene.imagePrompt, refTemplateId: id } }); setTemplatePickerOpen(false); }}
                onClose={() => setTemplatePickerOpen(false)}
              />
            )}
            {/* ファイルブラウザ */}
            {fileBrowserOpen && (
              <FileBrowserModal
                workspaceId={workspaceId}
                current={scene.imagePrompt.refFileUrl ?? null}
                onSelect={(url) => { onUpdate({ imagePrompt: { ...scene.imagePrompt, mode: "ref-file", refFileUrl: url } }); setFileBrowserOpen(false); }}
                onClose={() => setFileBrowserOpen(false)}
              />
            )}
          </>
        }
      >
        <OutputCard>
          <CardRow>
            <ColorBadge color={GRAD_BLUE} onClick={() => onTogglePrompt("image")}>AI画像</ColorBadge>
            <div style={{ display: "flex", gap: 4 }}>
              {scene.imageUrl && (
                <SmBtn title="削除" onClick={() => onUpdate({ imageUrl: null })}><TrashIcon size={12} /></SmBtn>
              )}
              <div style={{ position: "relative" }}>
                <SmBtn
                  title="画像をアップロード"
                  onClick={uploadingImg ? undefined : () => setImgUploadPickerOpen((v) => !v)}
                >
                  <span style={{ opacity: uploadingImg ? 0.5 : 1, display: "flex" }}>
                    {uploadingImg ? <RefreshIcon /> : <UploadImgIcon />}
                  </span>
                </SmBtn>
                {imgUploadPickerOpen && (
                  <UploadSourceDropdown
                    onPc={() => imgUploadRef.current?.click()}
                    onFile={() => setImgUploadBrowserOpen(true)}
                    onClose={() => setImgUploadPickerOpen(false)}
                  />
                )}
              </div>
              <SmBtn
                title={scene.imageUrl ? "画像をダウンロード" : "ダウンロード（画像なし）"}
                onClick={scene.imageUrl ? () => downloadUrl(scene.imageUrl!, `scene${index + 1}_image${extFromUrl(scene.imageUrl!)}`) : undefined}
              >
                <span style={{ opacity: scene.imageUrl ? 1 : 0.3, display: "flex" }}><DownloadIcon /></span>
              </SmBtn>
            </div>
          </CardRow>

          <input
            ref={imgUploadRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleImgUpload}
          />
          {imgUploadBrowserOpen && (
            <FileBrowserModal
              workspaceId={workspaceId}
              current={scene.imageUrl}
              fileType="image"
              title="画像を選択"
              onSelect={(url) => { onUpdate({ imageUrl: url }); setImgUploadBrowserOpen(false); }}
              onClose={() => setImgUploadBrowserOpen(false)}
            />
          )}

          {scene.imageUrl
            ? (
              <div
                onClick={() => setLightbox({ type: "image", url: scene.imageUrl! })}
                style={{ position: "relative", width: "100%", paddingBottom: imgPct, borderRadius: 8, overflow: "hidden", marginTop: 4, cursor: "zoom-in" }}
              >
                <img src={scene.imageUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            )
            : <ImgPlaceholder pct={imgPct} />
          }
        </OutputCard>
      </Step>

      {/* STEP 03 動画生成 */}
      <Step
        label="STEP 03 動画生成"
        icon={<VideoIcon />}
        stepOpen={stepOpen.video}
        promptOpen={promptOpen.video}
        onToggleStep={() => onToggleStep("video")}
        onTogglePrompt={() => onTogglePrompt("video")}
        onOpenSettings={() => onOpenSettings("video")}
        gradient={GRAD_NOMAL}
        color={PURPLE}
        promptSlot={
          <>
            <PromptCard>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <DarkBadge>プロンプト</DarkBadge>
                <HintIcon text="動画を出力するための指示プロンプトを入力してください。「指示プロンプト」と「AI出力画像」フィールドの情報を基に動画が出力されます。" />
              </div>
              <div style={{ height: 8 }} />
              <PromptTA
                value={scene.videoPrompt.instructions}
                onChange={(v) => onUpdate({ videoPrompt: { ...scene.videoPrompt, instructions: v } })}
                placeholder="例: カメラをゆっくりズームインしながら、人物が振り返る"
                rows={4}
              />
            </PromptCard>
            {generatingVideo && (
              <GenStatusBadge
                label={
                  videoStatus === "queued"  ? "サーバーにリクエスト送信中..." :
                  videoStatus === "running" ? `動画を生成中（${videoTimeEstimate(vidSettings.videoModel ?? "veo-3-lite")}）` :
                  "生成結果を確認中..."
                }
                state={
                  videoStatus === "queued"  ? "preparing" :
                  videoStatus === "running" ? "processing" :
                  "checking"
                }
                color={PURPLE}
              />
            )}
            <GenButton
              color={PURPLE}
              gradient={GRAD_PURPLE}
              label="AI動画生成"
              loading={generatingVideo}
              loadingLabel="動画生成中"
              disabled={!scene.videoPrompt.instructions.trim() && !scene.imageUrl}
              onClick={onGenerateVideo}
            />
            {!generatingVideo && genErrors.video && <ErrorBanner message={genErrors.video} />}
          </>
        }
      >
        <OutputCard>
          <CardRow>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ColorBadge color={GRAD_PURPLE} onClick={() => onTogglePrompt("video")}>AI動画</ColorBadge>
              {scene.videoDuration != null && (
                <span style={{ fontSize: 11, color: "#aaa", fontFamily: FONT }}>{scene.videoDuration.toFixed(1)}秒</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {scene.videoUrl && (
                <SmBtn title="削除" onClick={() => onUpdate({ videoUrl: null })}><TrashIcon size={12} /></SmBtn>
              )}
              {scene.videoUrl && (
                <SmBtn title="拡大再生" onClick={() => setLightbox({ type: "video", url: scene.videoUrl! })}><ExpandIcon /></SmBtn>
              )}
              <div style={{ position: "relative" }}>
                <SmBtn
                  title="動画をアップロード"
                  onClick={uploadingVideo ? undefined : () => setVideoUploadPickerOpen((v) => !v)}
                >
                  <span style={{ opacity: uploadingVideo ? 0.5 : 1, display: "flex" }}>
                    {uploadingVideo ? <RefreshIcon /> : <UploadImgIcon />}
                  </span>
                </SmBtn>
                {videoUploadPickerOpen && (
                  <UploadSourceDropdown
                    onPc={() => videoUploadRef.current?.click()}
                    onFile={() => setVideoUploadBrowserOpen(true)}
                    onClose={() => setVideoUploadPickerOpen(false)}
                  />
                )}
              </div>
              <SmBtn
                title={scene.videoUrl ? "動画をダウンロード" : "ダウンロード（動画なし）"}
                onClick={scene.videoUrl ? () => downloadUrl(scene.videoUrl!, `scene${index + 1}_video${extFromUrl(scene.videoUrl!)}`) : undefined}
              >
                <span style={{ opacity: scene.videoUrl ? 1 : 0.3, display: "flex" }}><DownloadIcon /></span>
              </SmBtn>
            </div>
          </CardRow>

          <input
            ref={videoUploadRef}
            type="file"
            accept="video/*"
            style={{ display: "none" }}
            onChange={handleVideoUpload}
          />
          {videoUploadBrowserOpen && (
            <FileBrowserModal
              workspaceId={workspaceId}
              current={scene.videoUrl}
              fileType="video"
              onSelect={(url) => {
                onUpdate({ videoUrl: url, videoDuration: null });
                setVideoUploadBrowserOpen(false);
                getVideoDurationFromUrl(url).then((dur) => { if (dur != null) onUpdate({ videoDuration: dur }); }).catch(() => {});
              }}
              onClose={() => setVideoUploadBrowserOpen(false)}
            />
          )}

          {scene.videoUrl
            ? (
              <div style={{ position: "relative", width: "100%", paddingBottom: vidPct, borderRadius: 8, overflow: "hidden", marginTop: 4, background: "#000" }}>
                <video src={scene.videoUrl} controls style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
              </div>
            )
            : (
              <div
                onClick={() => videoUploadRef.current?.click()}
                style={{ cursor: "pointer" }}
              >
                <VideoPlaceholder pct={vidPct} />
              </div>
            )
          }
        </OutputCard>
      </Step>

      {/* STEP 04 ナレーション生成 */}
      {(() => {
        const ws = loadTtsSettings();
        const wsModelDef = GEMINI_TTS_MODELS.find((m) => m.key === ws.model) ?? GEMINI_TTS_MODELS[0];
        const wsPacingLabel  = TTS_PACING_OPTIONS.find((p) => p.value === ws.pacing)?.label ?? ws.pacing;
        const wsToneLabel    = TTS_TONE_OPTIONS.find((t)  => t.value === ws.tone)?.label   ?? ws.tone;
        const hasVoiceOverride  = scene.narrationPrompt.ttsVoice  !== null;
        const hasPacingOverride = scene.narrationPrompt.ttsPacing !== null;
        const hasToneOverride   = scene.narrationPrompt.ttsTone   !== null;
        const hasStyleOverride  = scene.narrationPrompt.ttsStyle  !== null;
        const hasAnyOverride    = hasVoiceOverride || hasPacingOverride || hasToneOverride || hasStyleOverride;
        const effVoice  = scene.narrationPrompt.ttsVoice  ?? ws.voice;
        const effPacing = scene.narrationPrompt.ttsPacing ?? ws.pacing;
        const effTone   = scene.narrationPrompt.ttsTone   ?? ws.tone;

        const labelSt: React.CSSProperties = { fontSize: 9, fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: 3, letterSpacing: "0.05em", fontFamily: FONT };
        const inheritBadge = (label: string) => (
          <span style={{ fontSize: 9, color: "#94a3b8", background: "#f1f5f9", borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>WS: {label}</span>
        );
        const overrideBadge = (label: string) => (
          <span style={{ fontSize: 9, color: PURPLE, background: `${PURPLE}12`, borderRadius: 4, padding: "1px 5px", marginLeft: 4 }}>↑ {label}</span>
        );

        return (
      <Step
        label="STEP 04 ナレーション生成"
        icon={<MicIcon />}
        stepOpen={stepOpen.narration}
        promptOpen={promptOpen.narration}
        onToggleStep={() => onToggleStep("narration")}
        onTogglePrompt={() => onTogglePrompt("narration")}
        onOpenSettings={() => onOpenSettings("narration")}
        gradient={GRAD_NOMAL}
        color={PURPLE}
        promptSlot={
          <>
            <PromptCard>
              {/* ワークスペース設定の概要 */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <DarkBadge>音声設定</DarkBadge>
                <span style={{ fontSize: 9, color: "#94a3b8", fontFamily: FONT }}>
                  {ws.provider === "google-gemini" ? wsModelDef.label : "ElevenLabs"}
                </span>
              </div>

              {/* 音声（上書き可） */}
              <div style={{ marginBottom: 6 }}>
                <label style={labelSt}>
                  音声
                  {hasVoiceOverride ? overrideBadge(effVoice) : inheritBadge(ws.voice)}
                </label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <select
                    value={effVoice}
                    onChange={(e) => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsVoice: e.target.value } })}
                    style={{ ...promptInputSt, flex: 1 }}
                  >
                    {GEMINI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  {hasVoiceOverride && (
                    <button
                      title="ワークスペース設定に戻す"
                      onClick={() => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsVoice: null } })}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}
                    >↩</button>
                  )}
                </div>
              </div>

              {/* 速度（上書き可） */}
              <div style={{ marginBottom: 6 }}>
                <label style={labelSt}>
                  速度
                  {hasPacingOverride
                    ? overrideBadge(TTS_PACING_OPTIONS.find((p) => p.value === effPacing)?.label ?? effPacing)
                    : inheritBadge(wsPacingLabel)}
                </label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <select
                    value={effPacing}
                    onChange={(e) => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsPacing: e.target.value } })}
                    style={{ ...promptInputSt, flex: 1 }}
                  >
                    {TTS_PACING_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  {hasPacingOverride && (
                    <button
                      title="ワークスペース設定に戻す"
                      onClick={() => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsPacing: null } })}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}
                    >↩</button>
                  )}
                </div>
              </div>

              {/* 感情（上書き可） */}
              <div style={{ marginBottom: 6 }}>
                <label style={labelSt}>
                  感情・トーン
                  {hasToneOverride
                    ? overrideBadge(TTS_TONE_OPTIONS.find((t) => t.value === effTone)?.label ?? effTone)
                    : inheritBadge(wsToneLabel)}
                </label>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <select
                    value={effTone}
                    onChange={(e) => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsTone: e.target.value } })}
                    style={{ ...promptInputSt, flex: 1 }}
                  >
                    {TTS_TONE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {hasToneOverride && (
                    <button
                      title="ワークスペース設定に戻す"
                      onClick={() => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsTone: null } })}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", cursor: "pointer", fontFamily: FONT, flexShrink: 0 }}
                    >↩</button>
                  )}
                </div>
              </div>

              {/* スタイル（上書き可） */}
              <div>
                <label style={labelSt}>
                  スタイル（任意）
                  {hasStyleOverride ? overrideBadge("個別設定") : (ws.style ? inheritBadge("WS設定あり") : null)}
                </label>
                <div style={{ display: "flex", gap: 4, alignItems: "flex-start" }}>
                  <textarea
                    value={scene.narrationPrompt.ttsStyle ?? ws.style}
                    onChange={(e) => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsStyle: e.target.value || null } })}
                    placeholder="例: 落ち着いた企業VPのナレーション"
                    rows={2}
                    style={{ ...promptInputSt, flex: 1, resize: "none" }}
                  />
                  {hasStyleOverride && (
                    <button
                      title="ワークスペース設定に戻す"
                      onClick={() => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsStyle: null } })}
                      style={{ fontSize: 10, padding: "3px 6px", borderRadius: 5, border: "1px solid #e2e8f0", background: "#fff", color: "#94a3b8", cursor: "pointer", fontFamily: FONT, flexShrink: 0, marginTop: 2 }}
                    >↩</button>
                  )}
                </div>
              </div>

              {hasAnyOverride && (
                <button
                  onClick={() => onUpdate({ narrationPrompt: { ...scene.narrationPrompt, ttsVoice: null, ttsStyle: null, ttsPacing: null, ttsTone: null } })}
                  style={{ marginTop: 8, width: "100%", fontSize: 10, padding: "4px", borderRadius: 6, border: "1px dashed #e2e8f0", background: "transparent", color: "#94a3b8", cursor: "pointer", fontFamily: FONT }}
                >
                  すべてワークスペース設定に戻す
                </button>
              )}
            </PromptCard>
            <GenButton
              color={PURPLE}
              gradient={GRAD_PURPLE}
              label="AIナレーション生成"
              loading={generatingNarration}
              loadingLabel="音声合成中"
              onClick={onGenerateNarration}
            />
            {generatingNarration && (
              <GenStatusBadge label="AI TTS が音声を合成中..." state="processing" color={PURPLE} />
            )}
            {!generatingNarration && genErrors.narration && <ErrorBanner message={genErrors.narration} />}
          </>
        }
      >
        <OutputCard>
          <CardRow>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <ColorBadge color={GRAD_PURPLE} onClick={() => onTogglePrompt("narration")}>AIナレーション</ColorBadge>
              {scene.narrationDuration != null && (
                <span style={{ fontSize: 11, color: "#aaa", fontFamily: FONT }}>{scene.narrationDuration.toFixed(1)}秒</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {scene.narrationUrl && (
                <SmBtn title="削除" onClick={() => onUpdate({ narrationUrl: null, narrationName: null })}><TrashIcon size={12} /></SmBtn>
              )}
              <div style={{ position: "relative" }}>
                <SmBtn
                  title="音声をアップロード"
                  onClick={uploadingAudio ? undefined : () => setAudioUploadPickerOpen((v) => !v)}
                >
                  <span style={{ opacity: uploadingAudio ? 0.5 : 1, display: "flex" }}>
                    {uploadingAudio ? <RefreshIcon /> : <UploadImgIcon />}
                  </span>
                </SmBtn>
                {audioUploadPickerOpen && (
                  <UploadSourceDropdown
                    onPc={() => audioUploadRef.current?.click()}
                    onFile={() => setAudioUploadBrowserOpen(true)}
                    onClose={() => setAudioUploadPickerOpen(false)}
                  />
                )}
              </div>
              <SmBtn
                title={scene.narrationUrl ? "ナレーションをダウンロード" : "ダウンロード（ナレーションなし）"}
                onClick={scene.narrationUrl ? () => downloadUrl(scene.narrationUrl!, `scene${index + 1}_narration.wav`) : undefined}
              >
                <span style={{ opacity: scene.narrationUrl ? 1 : 0.3, display: "flex" }}><DownloadIcon /></span>
              </SmBtn>
            </div>
          </CardRow>
          <input
            ref={audioUploadRef}
            type="file"
            accept="audio/*"
            style={{ display: "none" }}
            onChange={handleAudioUpload}
          />
          {audioUploadBrowserOpen && (
            <FileBrowserModal
              workspaceId={workspaceId}
              current={scene.narrationUrl}
              fileType="audio"
              onSelect={(url) => {
                const name = url.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "ナレーション";
                onUpdate({ narrationUrl: url, narrationName: name, narrationDuration: null });
                setAudioUploadBrowserOpen(false);
                const a = new Audio(); a.preload = "metadata";
                a.onloadedmetadata = () => { const d = a.duration; if (isFinite(d) && d > 0) onUpdate({ narrationDuration: Math.round(d * 100) / 100 }); };
                a.src = url;
              }}
              onClose={() => setAudioUploadBrowserOpen(false)}
            />
          )}
          {scene.narrationUrl
            ? <AudioPlayer url={scene.narrationUrl} name={scene.narrationName ?? "ナレーション"} />
            : <NarrationPlaceholder />
          }
        </OutputCard>
      </Step>
        );
      })()}

    </div>

    {lightbox && (
      <MediaLightbox type={lightbox.type} url={lightbox.url} onClose={() => setLightbox(null)} />
    )}
    </>
  );
}

// ─── Step wrapper ─────────────────────────────────────────────────────────────

function Step({ label, icon, stepOpen, promptOpen, onToggleStep, onTogglePrompt, onOpenSettings, gradient, color, promptSlot, children }: {
  label: string; icon: React.ReactNode;
  stepOpen: boolean; promptOpen: boolean;
  onToggleStep: () => void; onTogglePrompt: () => void;
  onOpenSettings?: () => void;
  gradient: string;
  color: string;
  promptSlot: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {/* Step header */}
      <div style={{ display: "flex", alignItems: "center", paddingTop: 6 }}>
        <button
          onClick={onToggleStep}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "0 0 2px", fontSize: 10, fontWeight: 700, color: "#94a3b8", fontFamily: FONT, letterSpacing: "0.04em", textAlign: "left" }}
        >
          <span style={{ fontSize: 8, display: "inline-block", transform: stepOpen ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.25s ease", color: "#cbd5e1" }}>▼</span>
          {label}
          <span style={{ color: "#cbd5e1", display: "flex", alignItems: "center" }}>{icon}</span>
        </button>
      </div>

      {/* Step body - animated open/close */}
      <div style={{ display: "grid", gridTemplateRows: stepOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
        <div style={{ overflow: "hidden", minHeight: 0 }}>
          <div style={{ background: gradient, borderRadius: 10, padding: "8px", display: "flex", flexDirection: "column", gap: 6 }}>

            {/* +/- prompt toggle + gear icon */}
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button
                onClick={onTogglePrompt}
                title={promptOpen ? "プロンプトを閉じる" : "プロンプトを開く"}
                style={{ background: "none", border: "none", borderRadius: 4, cursor: "pointer", padding: "0 3px", fontSize: 16, fontWeight: 700, color: color, lineHeight: 1, opacity: 0.75, transition: "opacity 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; }}
              >
                {promptOpen ? "−" : "+"}
              </button>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  title="設定"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", color: color, display: "flex", alignItems: "center", borderRadius: 4, opacity: 0.75 }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.75"; }}
                >
                  <GearSmIcon />
                </button>
              )}
            </div>

            {/* Prompt section - animated show/hide */}
            <div style={{ display: "grid", gridTemplateRows: promptOpen ? "1fr" : "0fr", transition: "grid-template-rows 0.3s ease" }}>
              <div style={{ overflow: "hidden", minHeight: 0 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 2 }}>
                  {promptSlot}
                </div>
              </div>
            </div>

            {/* Output - always visible */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Prompt area ──────────────────────────────────────────────────────────────

function PromptCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#F7F7F7", borderRadius: CARD_R, padding: "12px", boxShadow: CARD_SH }}>
      {children}
    </div>
  );
}

function PromptSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 5, fontFamily: FONT, display: "flex", alignItems: "center", gap: 4 }}>
        {label}
        {hint && <HintIcon text={hint} />}
      </div>
      {children}
    </div>
  );
}

function PromptTA({ value, onChange, placeholder, rows }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, background: "#ffffff", fontSize: 11, color: "#334155", fontFamily: FONT, padding: "7px 9px", resize: "none", overflowY: "auto", outline: "none", lineHeight: 1.65 }}
    />
  );
}

const promptInputSt: React.CSSProperties = {
  width: "100%",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#f8fafc",
  fontSize: 11,
  color: "#334155",
  fontFamily: FONT,
  padding: "6px 9px",
  outline: "none",
};

// ─── Generate button ──────────────────────────────────────────────────────────

function GenButton({ color, gradient, label, onClick, loading = false, disabled = false, loadingLabel }: {
  color: string;
  gradient: string;
  label: string;
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  loadingLabel?: string;
}) {
  const inactive = loading || disabled;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <style>{`@keyframes gen-spin{to{transform:rotate(360deg)}}`}</style>

      {/* 左アイコン：通常は∨∨、生成中はスピナー */}
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        {loading
          ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ animation: "gen-spin 0.8s linear infinite" }}>
              <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="2" strokeOpacity="0.25"/>
              <path d="M9 2a7 7 0 0 1 7 7" stroke={color} strokeWidth="2" strokeLinecap="round"/>
            </svg>
          : <DoubleChevronIcon color={disabled ? `${color}55` : color} />
        }
      </span>

      <button
        onClick={inactive ? undefined : onClick}
        disabled={inactive}
        style={{
          flex: 1, height: 36,
          border: loading ? "none" : `1.5px solid ${disabled ? `${color}44` : color}`,
          borderRadius: 99,
          background: loading ? gradient : (disabled ? `${color}0d` : `${color}18`),
          color: loading ? "#fff" : (disabled ? `${color}55` : color),
          fontSize: 12, fontWeight: 700, cursor: inactive ? "not-allowed" : "pointer",
          fontFamily: FONT, letterSpacing: "0.04em", transition: "background 0.15s, color 0.15s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}
        onMouseEnter={(e) => { if (!inactive) { (e.currentTarget as HTMLButtonElement).style.background = color; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}}
        onMouseLeave={(e) => { if (!inactive) { (e.currentTarget as HTMLButtonElement).style.background = `${color}18`; (e.currentTarget as HTMLButtonElement).style.color = color; }}}
      >
        {loading && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ animation: "gen-spin 0.8s linear infinite", flexShrink: 0 }}>
            <circle cx="6.5" cy="6.5" r="5" stroke="rgba(255,255,255,0.4)" strokeWidth="1.8"/>
            <path d="M6.5 1.5a5 5 0 0 1 5 5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
        {loading ? (loadingLabel ?? "生成中...") : label}
      </button>
    </div>
  );
}

// ─── Generation status badge ──────────────────────────────────────────────────

function GenStatusBadge({ label, state, color }: {
  label: string;
  state: "preparing" | "processing" | "checking";
  color: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 7,
      padding: "6px 10px",
      background: `${color}08`,
      border: `1px solid ${color}22`,
      borderRadius: 8,
      fontFamily: FONT,
    }}>
      <style>{`@keyframes badge-pulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
      <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
        {state === "preparing" && <HourglassFlatIcon color={color} />}
        {state === "processing" && (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ animation: "gen-spin 1.2s linear infinite" }}>
            <circle cx="7" cy="7" r="5.5" stroke={`${color}30`} strokeWidth="1.8"/>
            <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        )}
        {state === "checking" && <SearchFlatIcon color={color} />}
      </span>
      <span style={{ flex: 1, fontSize: 10, color, fontWeight: 600, lineHeight: 1.4, opacity: 0.85 }}>
        {label}
      </span>
      <span style={{ flexShrink: 0, display: "flex", gap: 3, alignItems: "center" }}>
        {[0, 0.25, 0.5].map((d, i) => (
          <span key={i} style={{ width: 3, height: 3, borderRadius: "50%", background: color, animation: `badge-pulse 1.2s ease ${d}s infinite`, display: "block", opacity: 0.5 }} />
        ))}
      </span>
    </div>
  );
}

function HourglassFlatIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2h8M3 12h8"/>
      <path d="M4 2C4 5.5 7 7 7 7C7 7 10 8.5 10 12"/>
      <path d="M10 2C10 5.5 7 7 7 7C7 7 4 8.5 4 12"/>
    </svg>
  );
}

function SearchFlatIcon({ color }: { color: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="4.5"/>
      <path d="M9.5 9.5l3 3"/>
    </svg>
  );
}

// ─── Output card ─────────────────────────────────────────────────────────────

function OutputCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#F7F7F7", borderRadius: CARD_R, padding: "10px 12px", boxShadow: CARD_SH }}>
      {children}
    </div>
  );
}

function CardRow({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>{children}</div>;
}

function DarkBadge({ children }: { children: React.ReactNode }) {
  return <span style={{ background: DARK, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 7, fontFamily: FONT }}>{children}</span>;
}

function ColorBadge({ color, onClick, children }: { color: string; onClick?: () => void; children: React.ReactNode }) {
  return (
    <span
      onClick={onClick}
      style={{ background: color, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 7, fontFamily: FONT, cursor: onClick ? "pointer" : "default" }}
    >
      {children}
    </span>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

function ColIconBtn({ onClick, title, children }: { onClick?: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", color: "#cbd5e1", display: "flex", alignItems: "center", borderRadius: 5 }}>
      {children}
    </button>
  );
}

function SmBtn({ onClick, title, children }: { onClick?: () => void; title?: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title} style={{ background: "none", border: "none", cursor: "pointer", padding: 3, color: "#94a3b8", display: "flex", alignItems: "center", borderRadius: 4 }}>
      {children}
    </button>
  );
}

// ─── Placeholders ─────────────────────────────────────────────────────────────

function ratioPct(r: string): string {
  const [w, h] = r.split(":").map(Number);
  if (!w || !h) return "56.25%";
  return `${(h / w * 100).toFixed(2)}%`;
}

function ImgPlaceholder({ pct }: { pct: string }) {
  return (
    <div style={{ width: "100%", paddingBottom: pct, position: "relative", background: "#FFFFFF", borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="52" height="44" viewBox="0 0 52 44" fill="none">
          <rect x="2" y="2" width="48" height="40" rx="5" stroke="#cbd5e1" strokeWidth="1.8"/>
          <circle cx="14" cy="15" r="5" stroke="#cbd5e1" strokeWidth="1.8"/>
          <path d="M2 32l12-12 9 9 8-8 19 13" stroke="#cbd5e1" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}

function VideoPlaceholder({ pct }: { pct: string }) {
  return (
    <div style={{ width: "100%", paddingBottom: pct, position: "relative", background: "#f8fafc", borderRadius: 8, border: "1.5px dashed #e2e8f0", overflow: "hidden", marginTop: 4 }}>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="90" height="40" viewBox="0 0 90 40" fill="none">
          <circle cx="10" cy="32" r="5.5" stroke="#cbd5e1" strokeWidth="1.8"/>
          <circle cx="80" cy="32" r="5.5" stroke="#cbd5e1" strokeWidth="1.8"/>
          <circle cx="45" cy="16" r="5" fill="#e2e8f0"/>
          <path d="M10 32 C20 6 38 30 45 16 C52 2 68 26 80 32" stroke="#cbd5e1" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}

function NarrationPlaceholder() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, padding: "14px 8px", background: "#f8fafc", borderRadius: 8, border: "1.5px dashed #e2e8f0", marginTop: 4 }}>
      <svg width="44" height="18" viewBox="0 0 44 18" fill="none">
        <rect x="0"  y="7"  width="3" height="4"  rx="1.5" fill="#cbd5e1"/>
        <rect x="6"  y="3"  width="3" height="12" rx="1.5" fill="#cbd5e1"/>
        <rect x="12" y="1"  width="3" height="16" rx="1.5" fill="#cbd5e1"/>
        <rect x="18" y="5"  width="3" height="8"  rx="1.5" fill="#cbd5e1"/>
        <rect x="24" y="0"  width="3" height="18" rx="1.5" fill="#cbd5e1"/>
        <rect x="30" y="4"  width="3" height="10" rx="1.5" fill="#cbd5e1"/>
        <rect x="36" y="7"  width="3" height="4"  rx="1.5" fill="#cbd5e1"/>
        <rect x="42" y="9"  width="2" height="2"  rx="1"   fill="#cbd5e1"/>
      </svg>
      <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: FONT }}>ナレーション未生成</span>
    </div>
  );
}

// ─── Audio Player ─────────────────────────────────────────────────────────────

function AudioPlayer({ url, name }: { url: string; name: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!ref.current) return;
    if (playing) { ref.current.pause(); setPlaying(false); }
    else { ref.current.play().then(() => setPlaying(true)); }
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} />
      <WaveIcon />
      <span style={{ flex: 1, fontSize: 12, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
      <button onClick={toggle} style={{ width: 26, height: 26, borderRadius: "50%", background: "#22c55e", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, flexShrink: 0 }}>
        {playing ? "⏸" : "▶"}
      </button>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", flexShrink: 0 }} />
    </div>
  );
}

// ─── Hint tooltip ────────────────────────────────────────────────────────────

function HintIcon({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ width: 13, height: 13, borderRadius: "50%", border: "1.5px solid #94a3b8", color: "#94a3b8", fontSize: 8, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "help", lineHeight: 1, flexShrink: 0 }}>
        ?
      </span>
      {show && (
        <span style={{ position: "absolute", left: "50%", bottom: "calc(100% + 6px)", transform: "translateX(-50%)", background: "#1e293b", color: "#FFFFFF", fontSize: 10, lineHeight: 1.65, padding: "8px 10px", borderRadius: 8, width: 200, zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "none", whiteSpace: "normal", display: "block", fontWeight: 400 }}>
          {text}
          <span style={{ position: "absolute", left: "50%", top: "100%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid #1e293b", display: "block" }} />
        </span>
      )}
    </span>
  );
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3.5h10M5.5 3.5V2.5h3v1M11 3.5l-.5 8H3.5L3 3.5"/>
    </svg>
  );
}
function PlusIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 2v10M2 7h10"/>
    </svg>
  );
}
function DuplicateIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="8" height="9" rx="1.5"/>
      <path d="M2 10V3a1 1 0 0 1 1-1h7"/>
    </svg>
  );
}
function DragHandleIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
      <circle cx="3" cy="3"  r="1.2"/><circle cx="7" cy="3"  r="1.2"/>
      <circle cx="3" cy="7"  r="1.2"/><circle cx="7" cy="7"  r="1.2"/>
      <circle cx="3" cy="11" r="1.2"/><circle cx="7" cy="11" r="1.2"/>
    </svg>
  );
}
function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="2" y="1" width="10" height="12" rx="1.5"/><path d="M5 5h4M5 7.5h4M5 10h2.5"/>
    </svg>
  );
}
function ImgIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
      <rect x="1" y="1.5" width="10" height="9" rx="1.5"/>
      <circle cx="4" cy="4.5" r="1.2"/>
      <path d="M1 8.5l3-3 2 2 2-2 3 3"/>
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2.5" width="7.5" height="7" rx="1.5"/>
      <path d="M8.5 5l3-2v6l-3-2"/>
    </svg>
  );
}
function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
      <rect x="5" y="1" width="4" height="7" rx="2"/><path d="M2 7a5 5 0 0 0 10 0M7 12v1.5"/>
    </svg>
  );
}
function GearSmIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.92c.04-.34.07-.68.07-1.08s-.03-.74-.07-1.08l2.32-1.84c.21-.16.27-.47.12-.7l-2.2-3.82c-.14-.23-.44-.3-.67-.23l-2.73 1.1c-.57-.44-1.18-.81-1.85-1.08L14.09 2H9.91L9.5 4.83C8.83 5.1 8.22 5.47 7.65 5.91L4.92 4.81c-.23-.07-.53 0-.67.23L2.05 8.86c-.14.23-.08.54.12.7l2.32 1.84C4.03 11.26 4 11.6 4 12s.03.74.07 1.08l-2.32 1.84c-.21.16-.27.47-.12.7l2.2 3.82c.14.23.44.3.67.23l2.73-1.1c.57.44 1.18.81 1.85 1.08L9.91 22h4.18l.41-2.83c.67-.27 1.28-.64 1.85-1.08l2.73 1.1c.23.07.53 0 .67-.23l2.2-3.82c.14-.23.08-.54-.12-.7l-2.32-1.84Z"/>
    </svg>
  );
}
function UploadImgIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 9V2M4.5 4.5L7 2l2.5 2.5"/>
      <path d="M2 10.5v1a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-1"/>
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2.5A5.5 5.5 0 1 0 12.5 7"/><path d="M11 2.5V5.5H8"/>
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 2v8M4.5 7.5L7 10l2.5-2.5"/><path d="M2 12h10"/>
    </svg>
  );
}
function WaveIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
      <path d="M1 6h1.5M3.5 3v6M5.5 4.5v3M7.5 2v8M9 4v4M10.5 3v6M12.5 4.5v3M14.5 6H16.5"/>
    </svg>
  );
}
function DoubleChevronIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3l7 6 7-6"/>
      <path d="M2 9l7 6 7-6"/>
    </svg>
  );
}
function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1h4v4M5 13H1V9M13 9v4H9M1 5V1h4"/>
    </svg>
  );
}

// ─── Media Lightbox ───────────────────────────────────────────────────────────

function MediaLightbox({ type, url, onClose }: { type: "image" | "video"; url: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)",
        zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%",
          width: 36, height: 36, cursor: "pointer", color: "#fff", fontSize: 20,
          display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
        }}
      >×</button>
      <div onClick={(e) => e.stopPropagation()}>
        {type === "image" ? (
          <img
            src={url}
            alt=""
            style={{ maxWidth: "90vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8, display: "block" }}
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, display: "block", background: "#000" }}
          />
        )}
      </div>
    </div>
  );
}
