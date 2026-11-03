import { useEffect, useRef, useState, MutableRefObject } from "react";
import { getProjectEditJson } from "@/lib/project.api";
import { buildEmptyEditConfig } from "@/lib/editor.utils";
import { getTimelineFonts } from "@/lib/fonts";
import type { Project } from "@/lib/project.api";
import type { EditConfig } from "@shotstack/shotstack-studio";
import { toast } from "@/lib/toast";

type EditorHandle = {
  loadEdit: (edit: EditConfig) => Promise<void>;
};

export function useProjectLoader(
  editRef: MutableRefObject<EditorHandle | null>,
  editorReady: boolean,
  selectedProject: Project | null,
  isLoadingRef: MutableRefObject<boolean>,
) {
  const [isProjectLoading, setIsProjectLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const isProjectLoadingRef = useRef(false);

  useEffect(() => {
    if (!editorReady || !editRef.current || !selectedProject) return;

    const load = async () => {
      isProjectLoadingRef.current = true;
      setIsProjectLoading(true);
      setLoadFailed(false);

      let config: EditConfig;

      if (selectedProject.editJsonKey) {
        const res = await getProjectEditJson(selectedProject.id).catch(() => null);
        if (!res?.ok) {
          // 読み込めないまま空のタイムラインを出すと、保存で保存済みの内容を上書きしてしまうので編集させない（isProjectLoadingRef は true のまま）
          setLoadFailed(true);
          setIsProjectLoading(false);
          toast(`プロジェクトを読み込めませんでした${res?.message ? `（${res.message}）` : ""}。通信状況を確認して、ページを再読み込みしてください。`);
          return;
        }
        if (res.editJson) {
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

  return { isProjectLoading, isProjectLoadingRef, loadFailed };
}
