"use client";

import { TEAL } from "@/components/icons";

type Props = {
  isLoading: boolean;
};

export default function EditorProjectLoadingOverlay({ isLoading }: Props) {
  if (!isLoading) return null;

  return (
    <>
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: "20px 32px",
          fontSize: 14,
          color: "#333",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          プロジェクトを読み込み中...
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}