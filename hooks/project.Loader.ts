import { useEffect, useRef, useState, MutableRefObject } from "react";
import { getProjectEditJson } from "@/lib/project.api";
import { buildEmptyEditConfig } from "@/lib/editor.utils";
import { getTimelineFonts } from "@/lib/fonts";
import type { Project } from "@/lib/project.api";
import type { EditConfig } from "@shotstack/shotstack-studio";

type EditorHandle = {
  loadEdit: (edit: EditConfig) => Promise<void>;
};

function stripHtmlClips(editJson: EditConfig): EditConfig {
  if (!editJson?.timeline?.tracks) return editJson;

  return {
    ...editJson,
    timeline: {
      ...editJson.timeline,
      tracks: editJson.timeline.tracks
        .map((track) => ({
          ...track,
          clips: Array.isArray(track.clips)
            ? track.clips.filter((clip) => {
                const asset = clip?.asset as { type?: string } | undefined;
                return asset?.type !== "html";
              })
            : [],
        }))
        .filter((track) => track.clips.length > 0),
    },
  };
}

export function useProjectLoader(
  editRef: MutableRefObject<EditorHandle | null>,
  editorReady: boolean,
  selectedProject: Project | null,
  isLoadingRef: MutableRefObject<boolean>,
) {
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const isProjectLoadingRef = useRef(false);

  useEffect(() => {
    if (!editorReady || !editRef.current || !selectedProject) return;

    const load = async () => {
      isProjectLoadingRef.current = true;
      setIsProjectLoading(true);

      let config: EditConfig;

      if (selectedProject.editJsonKey) {
        try {
          const res = await getProjectEditJson(selectedProject.id);
          console.log("R2から取得したeditJson:", JSON.stringify(res.editJson).slice(0, 200));

          if (res.ok && res.editJson) {
  const loaded = res.editJson as any;
  // htmlアセットをrich-textに変換
  const tracks = loaded.timeline?.tracks?.map((track: any) => ({
    ...track,
    clips: track.clips?.map((clip: any) => {
      if (clip.asset?.type === "html") {
        return {
          ...clip,
          asset: {
            type: "rich-text",
            text: clip.asset.html?.replace(/<[^>]*>/g, "") || " ",
          },
        };
      }
      return clip;
    }),
  }));
  config = {
    ...loaded,
    timeline: {
      ...loaded.timeline,
      tracks,
      fonts: getTimelineFonts(),
    },
  } as EditConfig;
} else {
            config = buildEmptyEditConfig(selectedProject);
          }
        } catch {
          config = buildEmptyEditConfig(selectedProject);
        }
      } else {
        config = buildEmptyEditConfig(selectedProject);
      }

      isLoadingRef.current = true;
      try {
        await editRef.current!.loadEdit(config);
      } catch (error) {
        console.error("timeline load error:", error);
      } finally {
        isLoadingRef.current = false;
        setTimeout(() => {
          isProjectLoadingRef.current = false;
          setIsProjectLoading(false);
        }, 500);
      }
    };

    void load();
  }, [editorReady, selectedProject, editRef, isLoadingRef]);

  return { isProjectLoading, isProjectLoadingRef };
}