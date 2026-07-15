"use client";

import { ReactNode, useState } from "react";
import SidePanel from "./SidePanel";
import { useIsMobile } from "@/lib/useIsMobile";

type EditorLayoutProps = {
  children: ReactNode;
};

export default function EditorLayout({ children }: EditorLayoutProps) {
  const isMobile = useIsMobile();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  return (
    <div className="editor-layout">
      {isMobile && (
        <button
          onClick={() => setSidePanelOpen(true)}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 200,
            width: 40, height: 40, border: "none", borderRadius: 10,
            background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.15)",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          {[0,1,2].map((i) => (
            <span key={i} style={{ display: "block", width: 16, height: 2, borderRadius: 1, background: "#334155" }} />
          ))}
        </button>
      )}
      <SidePanel isOpen={sidePanelOpen} onClose={() => setSidePanelOpen(false)} />
      <main className="editor-main">{children}</main>
    </div>
  );
}