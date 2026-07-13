import { getShotstackFontId } from "./fonts";

// Transform functions for Shotstack edit.json (bulk edit)

type AnyClip  = Record<string, any>;
type AnyTrack = { clips: AnyClip[] };
type AnyEdit  = {
  timeline: {
    tracks: AnyTrack[];
    background?: string;
    soundtrack?: { src: string; volume?: number; effect?: string };
    fonts?: unknown[];
  };
  output: {
    format: string;
    size: { width: number; height: number };
    fps: number;
    resolution?: string;
  };
};

function isTelopClip(c: AnyClip) {
  const t = c?.asset?.type;
  return t === "html" || t === "rich-text";
}
function isVisualClip(c: AnyClip) {
  const t = c?.asset?.type;
  return t === "image" || t === "video" || t === "svg";
}
function isAudioClip(c: AnyClip) {
  return c?.asset?.type === "audio";
}
function flatClips(edit: AnyEdit): AnyClip[] {
  return edit.timeline.tracks.flatMap((t) => t.clips ?? []);
}

export type BulkEditOps = {
  // A テロップ
  telopColor?: string;
  telopFontSize?: number;
  telopFontFamily?: string;
  telopFontWeight?: 300 | 400 | 500 | 700 | 900;
  telopBold?: boolean;
  telopLetterSpacing?: number;
  telopLineHeight?: number;
  telopPosition?: "top" | "bottom";
  telopShadow?: boolean;
  telopTransitionIn?: string;
  telopTransitionOut?: string;
  removeTelopTransition?: boolean;
  // B 尺・タイミング
  uniformDuration?: number;
  syncToVideo?: boolean;
  scaleTotalDuration?: number;
  // C トランジション・エフェクト
  addTransition?: string;
  removeTransition?: boolean;
  addEffect?: string;
  // D フィルター
  applyFilter?: string;
  removeFilter?: boolean;
  // E 音声・BGM
  soundtrack?: { src: string; volume: number; effect?: string };
  soundtrackVolume?: number;
  soundtrackEffect?: string;
  narrationVolume?: number;
  videoMute?: boolean;
  // F 出力設定
  backgroundColor?: string;
  resolution?: "720p" | "1080p" | "4k";
  fps?: 24 | 30 | 60;
};

const RES_MAP: Record<string, { width: number; height: number }> = {
  "720p":  { width: 1280,  height: 720  },
  "1080p": { width: 1920,  height: 1080 },
  "4k":    { width: 3840,  height: 2160 },
};

export function applyBulkEdit(raw: unknown, ops: BulkEditOps): unknown {
  const edit = structuredClone(raw) as AnyEdit;
  const all  = flatClips(edit);

  // ── A テロップ ────────────────────────────────────────────────────────────────

  if (ops.telopColor != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html" && c.asset.css) {
        c.asset.css = c.asset.css.replace(/color\s*:\s*[^;]+;/, `color: ${ops.telopColor};`);
      } else if (c.asset.type === "rich-text") {
        c.asset.font = { ...(c.asset.font ?? {}), color: ops.telopColor };
      }
    }
  }

  if (ops.telopFontSize != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html" && c.asset.css) {
        c.asset.css = c.asset.css.replace(/font-size\s*:\s*[^;]+;/, `font-size: ${ops.telopFontSize}px;`);
      } else if (c.asset.type === "rich-text") {
        c.asset.font = { ...(c.asset.font ?? {}), size: ops.telopFontSize };
      }
    }
  }

  if (ops.telopPosition != null) {
    for (const c of all) {
      if (isTelopClip(c)) {
        c.position = ops.telopPosition;
        c.offset   = { y: ops.telopPosition === "bottom" ? 0.08 : -0.08 };
      }
    }
  }

  if (ops.telopFontFamily != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html" && c.asset.css != null) {
        if (/font-family/.test(c.asset.css)) {
          c.asset.css = c.asset.css.replace(/font-family\s*:\s*[^;]+;/, `font-family: '${ops.telopFontFamily}', sans-serif;`);
        } else {
          c.asset.css += ` font-family: '${ops.telopFontFamily}', sans-serif;`;
        }
      } else if (c.asset.type === "rich-text") {
        c.asset.font = { ...(c.asset.font ?? {}), family: getShotstackFontId(ops.telopFontFamily) };
      }
    }
  }

  const weightValue = ops.telopFontWeight != null
    ? ops.telopFontWeight
    : ops.telopBold != null ? (ops.telopBold ? 700 : 400) : null;

  if (weightValue != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html" && c.asset.css != null) {
        if (/font-weight/.test(c.asset.css)) {
          c.asset.css = c.asset.css.replace(/font-weight\s*:\s*[^;]+;/, `font-weight: ${weightValue};`);
        } else {
          c.asset.css += ` font-weight: ${weightValue};`;
        }
      } else if (c.asset.type === "rich-text") {
        c.asset.font = { ...(c.asset.font ?? {}), weight: String(weightValue) };
      }
    }
  }

  if (ops.telopLetterSpacing != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html" && c.asset.css != null) {
        if (/letter-spacing/.test(c.asset.css)) {
          c.asset.css = c.asset.css.replace(/letter-spacing\s*:\s*[^;]+;/, `letter-spacing: ${ops.telopLetterSpacing}px;`);
        } else {
          c.asset.css += ` letter-spacing: ${ops.telopLetterSpacing}px;`;
        }
      } else if (c.asset.type === "rich-text") {
        c.asset.font = { ...(c.asset.font ?? {}), letterSpacing: ops.telopLetterSpacing };
      }
    }
  }

  if (ops.telopLineHeight != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html" && c.asset.css != null) {
        if (/line-height/.test(c.asset.css)) {
          c.asset.css = c.asset.css.replace(/line-height\s*:\s*[^;]+;/, `line-height: ${ops.telopLineHeight};`);
        } else {
          c.asset.css += ` line-height: ${ops.telopLineHeight};`;
        }
      } else if (c.asset.type === "rich-text") {
        c.asset.font = { ...(c.asset.font ?? {}), lineHeight: ops.telopLineHeight };
      }
    }
  }

  if (ops.telopShadow != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      if (c.asset.type === "html") {
        const css = c.asset.css ?? "";
        if (ops.telopShadow) {
          c.asset.css = css.includes("text-shadow")
            ? css
            : css + " text-shadow: 0 2px 8px rgba(0,0,0,0.9);";
        } else {
          c.asset.css = css.replace(/text-shadow\s*:[^;]+;?\s*/g, "");
        }
      } else if (c.asset.type === "rich-text") {
        if (ops.telopShadow) {
          c.asset.shadow = { color: "rgba(0,0,0,0.9)", blur: 8 };
        } else {
          delete c.asset.shadow;
        }
      }
    }
  }

  if (ops.telopTransitionIn != null || ops.telopTransitionOut != null) {
    for (const c of all) {
      if (!isTelopClip(c)) continue;
      const cur = c.transition ?? {};
      c.transition = {
        ...cur,
        ...(ops.telopTransitionIn  != null ? { in:  ops.telopTransitionIn  } : {}),
        ...(ops.telopTransitionOut != null ? { out: ops.telopTransitionOut } : {}),
      };
    }
  }
  if (ops.removeTelopTransition) {
    for (const c of all) {
      if (isTelopClip(c)) delete c.transition;
    }
  }

  // ── B 尺・タイミング ──────────────────────────────────────────────────────────

  if (ops.uniformDuration != null) {
    const sec = ops.uniformDuration;
    for (const track of edit.timeline.tracks) {
      for (let i = 0; i < track.clips.length; i++) {
        track.clips[i].start  = i * sec;
        track.clips[i].length = sec;
      }
    }
  }

  if (ops.syncToVideo) {
    const visualTrack = edit.timeline.tracks.find((t) => t.clips.some(isVisualClip));
    if (visualTrack) {
      for (let i = 0; i < visualTrack.clips.length; i++) {
        const { start, length } = visualTrack.clips[i];
        for (const track of edit.timeline.tracks) {
          if (track === visualTrack) continue;
          if (track.clips[i]) {
            track.clips[i].start  = start;
            track.clips[i].length = length;
          }
        }
      }
    }
  }

  if (ops.scaleTotalDuration != null) {
    const maxEnd = Math.max(0, ...all.map((c) => (c.start ?? 0) + (c.length ?? 0)));
    if (maxEnd > 0) {
      const ratio = ops.scaleTotalDuration / maxEnd;
      for (const c of all) {
        c.start  = Math.round((c.start  ?? 0) * ratio * 100) / 100;
        c.length = Math.round((c.length ?? 0) * ratio * 100) / 100;
      }
    }
  }

  // ── C トランジション・エフェクト ──────────────────────────────────────────────

  if (ops.addTransition) {
    for (const c of all) {
      if (isVisualClip(c)) c.transition = { in: ops.addTransition, out: ops.addTransition };
    }
  }
  if (ops.removeTransition) {
    for (const c of all) {
      delete c.transition;
      delete c.effect;
    }
  }
  if (ops.addEffect) {
    for (const c of all) {
      if (isVisualClip(c)) c.effect = ops.addEffect;
    }
  }

  // ── D フィルター ──────────────────────────────────────────────────────────────

  if (ops.applyFilter) {
    for (const c of all) {
      if (isVisualClip(c)) c.filter = ops.applyFilter;
    }
  }
  if (ops.removeFilter) {
    for (const c of all) {
      if (isVisualClip(c)) c.filter = "none";
    }
  }

  // ── E 音声・BGM ───────────────────────────────────────────────────────────────

  if (ops.soundtrack) {
    edit.timeline.soundtrack = {
      src:    ops.soundtrack.src,
      volume: ops.soundtrack.volume,
      ...(ops.soundtrack.effect ? { effect: ops.soundtrack.effect } : {}),
    };
  }
  if (ops.soundtrackVolume != null && edit.timeline.soundtrack) {
    edit.timeline.soundtrack.volume = ops.soundtrackVolume;
  }
  if (ops.soundtrackEffect != null && edit.timeline.soundtrack) {
    edit.timeline.soundtrack.effect = ops.soundtrackEffect;
  }
  if (ops.narrationVolume != null) {
    for (const c of all) {
      if (isAudioClip(c)) c.asset.volume = ops.narrationVolume;
    }
  }
  if (ops.videoMute != null) {
    for (const c of all) {
      if (c?.asset?.type === "video") c.asset.volume = ops.videoMute ? 0 : 1;
    }
  }

  // ── F 出力設定 ────────────────────────────────────────────────────────────────

  if (ops.backgroundColor) edit.timeline.background = ops.backgroundColor;
  if (ops.resolution) {
    const sz = RES_MAP[ops.resolution];
    if (sz) edit.output.size = { ...sz };
  }
  if (ops.fps) edit.output.fps = ops.fps;

  return edit;
}
