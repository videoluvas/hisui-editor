import { useEffect, useRef, MutableRefObject } from "react";
import { saveProjectEditJson } from "@/lib/project.api";
import type { Project } from "@/lib/project.api";
import type { EditConfig } from "@shotstack/shotstack-studio";
import type { AutoSaveMode, AutoSaveInterval } from "@/components/editor.SavePanel";

type EditorHandle = {
  getEdit: () => EditConfig;
  events: {
    on: (event: string, handler: (data: unknown) => void) => void;
  };
};

// onChange: 変更から 3 秒後に保存 / interval: 未保存の変更があれば指定秒ごとに保存
export function useEditorAutosave(
  editRef: MutableRefObject<EditorHandle | null>,
  selectedProjectRef: MutableRefObject<Project | null>,
  isLoadingRef: MutableRefObject<boolean>,
  isProjectLoadingRef: MutableRefObject<boolean>,
  editorReady: boolean,
  mode: AutoSaveMode,
  intervalSec: AutoSaveInterval,
  onAutoSaved?: () => void,
  onAutoSaveError?: () => void,
) {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const callbacksRef = useRef({ onAutoSaved, onAutoSaveError });
  callbacksRef.current = { onAutoSaved, onAutoSaveError };

  const saveNow = async () => {
    const project = selectedProjectRef.current;
    const editJson = editRef.current?.getEdit();
    if (!project || !editJson || isProjectLoadingRef.current) return;
    dirtyRef.current = false;
    try {
      const res = await saveProjectEditJson(project.id, editJson);
      if (!res.ok) throw new Error(res.message);
      callbacksRef.current.onAutoSaved?.();
    } catch (error) {
      dirtyRef.current = true;
      console.error("自動保存エラー:", error);
      callbacksRef.current.onAutoSaveError?.();
    }
  };
  const saveNowRef = useRef(saveNow);
  saveNowRef.current = saveNow;

  useEffect(() => {
    if (!editorReady) return;
    const edit = editRef.current;
    if (!edit) return;

    edit.events.on("edit:changed", () => {
      if (isLoadingRef.current || isProjectLoadingRef.current) return;
      dirtyRef.current = true;
      if (modeRef.current !== "onChange") return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => void saveNowRef.current(), 3000);
    });

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [editorReady, editRef, isLoadingRef, isProjectLoadingRef]);

  useEffect(() => {
    if (mode !== "interval") return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const id = setInterval(() => { if (dirtyRef.current) void saveNowRef.current(); }, intervalSec * 1000);
    return () => clearInterval(id);
  }, [mode, intervalSec]);

  // 未保存の変更があるままページを離れようとしたら確認する
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return {
    markSaved: () => { dirtyRef.current = false; if (saveTimerRef.current) clearTimeout(saveTimerRef.current); },
    // プロジェクト切り替え前に呼ぶ：保存対象とタイムラインは同期的に読み取るので、呼んだ直後に切り替えてよい
    flush: () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (dirtyRef.current) void saveNowRef.current();
    },
  };
}
