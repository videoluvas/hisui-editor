import { getTimelineFonts } from "@/lib/fonts";
import type { Project } from "@/lib/project.api";
import type { EditConfig } from "@shotstack/shotstack-studio";

const MAX_HEIGHT = 2160;
const MAX_WIDTH = 3840;

export const DEFAULT_PROJECT_SETTINGS = {
  width: 1920,
  height: 1080,
  fps: 30,
  backgroundColor: "#000000",
} as const;

export function clampClipSize<T extends Record<string, unknown>>(clip: T): T {
  const result = clip as Record<string, unknown>;
  if (typeof result.height === "number" && result.height > MAX_HEIGHT) result.height = MAX_HEIGHT;
  if (typeof result.width === "number" && result.width > MAX_WIDTH) result.width = MAX_WIDTH;
  return result as T;
}

export function getProjectSettings(project: Project | null) {
  return {
    width: project?.width ?? DEFAULT_PROJECT_SETTINGS.width,
    height: project?.height ?? DEFAULT_PROJECT_SETTINGS.height,
    fps: project?.fps ?? DEFAULT_PROJECT_SETTINGS.fps,
    backgroundColor: project?.backgroundColor ?? DEFAULT_PROJECT_SETTINGS.backgroundColor,
  };
}

export function buildEmptyEditConfig(project: Project | null): EditConfig {
  const s = getProjectSettings(project);
  return {
    timeline: {
      tracks: [{ clips: [{ asset: { type: "svg", src: '<svg viewBox="0 0 1 1" xmlns="http://www.w3.org/2000/svg"/>' } as any, start: 0, length: 1 }] }],
      fonts: getTimelineFonts(),
      background: s.backgroundColor,
    },
    output: {
      format: "mp4",
      resolution: "hd",
      size: { width: s.width, height: s.height },
      fps: s.fps,
    },
  } as EditConfig;
}