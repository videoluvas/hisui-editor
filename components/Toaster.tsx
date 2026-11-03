"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { onToast } from "@/lib/toast";
import type { ToastKind } from "@/lib/toast";

type Item = { id: number; message: string; kind: ToastKind };

let seq = 0;

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([]);
  const [mounted, setMounted] = useState(false);

  const dismiss = (id: number) => setItems((prev) => prev.filter((t) => t.id !== id));

  useEffect(() => {
    setMounted(true);
    return onToast(({ message, kind }) => {
      const id = ++seq;
      setItems((prev) => [...prev.filter((t) => t.message !== message), { id, message, kind }].slice(-4));
      setTimeout(() => dismiss(id), kind === "error" ? 8000 : 4000);
    });
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 3000, display: "flex", flexDirection: "column", gap: 8, width: "min(480px, calc(100vw - 32px))", fontFamily: "'Noto Sans JP', sans-serif" }}>
      {items.map((t) => (
        <div key={t.id} role={t.kind === "error" ? "alert" : "status"}
          style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 10,
            background: t.kind === "error" ? "#fef2f2" : "#f0fdfa",
            border: `1px solid ${t.kind === "error" ? "#fecaca" : "#99f6e4"}`,
            color: t.kind === "error" ? "#b91c1c" : "#0f766e",
            boxShadow: "0 6px 24px rgba(0,0,0,0.15)", fontSize: 13, lineHeight: 1.7,
          }}>
          <span style={{ flex: 1, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="閉じる"
            style={{ border: "none", background: "transparent", color: "inherit", cursor: "pointer", fontSize: 16, lineHeight: 1, padding: 2, opacity: 0.6 }}>×</button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
