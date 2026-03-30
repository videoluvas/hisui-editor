"use client";

import { useEffect, useState } from "react";
import ProjectPanel from "@/components/ProjectPanel";
import { handleEditorAuthFromUrl } from "@/lib/auth.front";

const TEMPLATE_URL =
  "https://shotstack-assets.s3.amazonaws.com/templates/sales-event-promotion/template.json";

const MAX_HEIGHT = 2160;
const MAX_WIDTH = 3840;

function clampClipSize<T extends Record<string, unknown>>(clip: T): T {
  const result = clip as Record<string, unknown>;
  if (typeof result.height === "number" && result.height > MAX_HEIGHT) result.height = MAX_HEIGHT;
  if (typeof result.width === "number" && result.width > MAX_WIDTH) result.width = MAX_WIDTH;
  return result as T;
}

export default function Home() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const initPage = async () => {
      try {
        const authResult = await handleEditorAuthFromUrl();
        if (authResult && !authResult.ok) {
          alert(authResult.message || "認証に失敗しました");
        }
      } catch (error) {
        console.error("Auth failed:", error);
      }

      setAuthReady(true);

      const initShotstack = async () => {
        try {
          const { Edit, Canvas, Controls, Timeline, UIController } =
            await import("@shotstack/shotstack-studio");

          const response = await fetch(TEMPLATE_URL);
          if (!response.ok) throw new Error(`Failed to load template: ${response.status}`);

          const template = await response.json();
          const edit = new Edit(template);
          const canvas = new Canvas(edit);
          const ui = UIController.create(edit, canvas);

          await canvas.load();
          await edit.load();

          ui.registerButton({
            id: "text",
            icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3H13"/><path d="M8 3V13"/><path d="M5 13H11"/></svg>`,
            tooltip: "Add Text",
          });

          ui.registerButton({
            id: "shape",
            icon: `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="12" height="12" rx="1.5"/></svg>`,
            tooltip: "Add Shape",
          });

          (ui.on as (event: string, handler: (payload: { position: number }) => void) => void)(
            "button:text", ({ position }) => {
              edit.addTrack(0, { clips: [clampClipSize({ asset: { type: "rich-text", text: "Title", font: { family: "Work Sans", size: 72, weight: 600, color: "#ffffff", opacity: 1 }, align: { horizontal: "center", vertical: "middle" } }, start: position, length: 5, width: 500, height: 200 })] });
            }
          );

          (ui.on as (event: string, handler: (payload: { position: number }) => void) => void)(
            "button:shape", ({ position }) => {
              edit.addTrack(0, { clips: [clampClipSize({ asset: { type: "svg", src: '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="100" height="100" rx="10" ry="10" fill="#00FFFF"/></svg>', opacity: 1 }, start: position, length: 10, width: 100, height: 100 })] });
            }
          );

          const timelineContainer = document.querySelector<HTMLElement>("[data-shotstack-timeline]");
          if (!timelineContainer) throw new Error("Timeline container not found");

          const timeline = new Timeline(edit, timelineContainer);
          await timeline.load();

          const controls = new Controls(edit);
          await controls.load();

          edit.events.on("clip:selected", (data: unknown) => console.log("Clip selected:", data));
          edit.events.on("clip:updated", (data: unknown) => console.log("Clip updated:", data));
          edit.play();
        } catch (error) {
          console.error("Failed to load demo:", error);
        }
      };

      await initShotstack();
    };

    initPage();
  }, []);

  return (
    <div className="editor-shell">
      <div className="editor-top">
        {authReady && <ProjectPanel />}

        <main className="studio-area">
          <div data-shotstack-studio className="c-shotstack-studio" />
        </main>
      </div>

      <div data-shotstack-timeline className="c-shotstack-timeline" />
    </div>
  );
}