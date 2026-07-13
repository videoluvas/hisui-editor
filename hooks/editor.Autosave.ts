import { useEffect, useRef, MutableRefObject } from "react";
import { saveProjectEditJson } from "@/lib/project.api";
import type { Project } from "@/lib/project.api";
import type { EditConfig } from "@shotstack/shotstack-studio";

type EditorHandle = {
  getEdit: () => EditConfig;
  events: {
    on: (event: string, handler: (data: unknown) => void) => void;
  };
};

export function useEditorAutosave(
  editRef: MutableRefObject<EditorHandle | null>,
  selectedProjectRef: MutableRefObject<Project | null>,
  isLoadingRef: MutableRefObject<boolean>,
  isProjectLoadingRef: MutableRefObject<boolean>,
  editorReady: boolean,
  onAutoSaved?: () => void,
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editorReady) return;
    const edit = editRef.current;
    if (!edit) return;

    edit.events.on("edit:changed", () => {
      console.log("edit:changed発火 isLoading=" + isLoadingRef.current + " isProjectLoading=" + isProjectLoadingRef.current + " project=" + selectedProjectRef.current?.id);
      if (isLoadingRef.current) { console.log("→ isLoadingRef でスキップ"); return; }
      if (isProjectLoadingRef.current) { console.log("→ isProjectLoadingRef でスキップ"); return; }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        console.log("保存実行 projectId:", selectedProjectRef.current?.id);
        const project = selectedProjectRef.current;
        if (!project) return;
        try {
          const editJson = editRef.current?.getEdit();
          if (!editJson) return;
          await saveProjectEditJson(project.id, editJson);
console.log("自動保存完了");
onAutoSaved?.();
        } catch (error) {
          console.error("自動保存エラー:", error);
        }
      }, 3000);
    });

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editorReady, editRef, selectedProjectRef, isLoadingRef, isProjectLoadingRef]);
}