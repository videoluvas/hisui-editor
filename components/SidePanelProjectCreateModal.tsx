"use client";

import { useMemo, useState } from "react";
import { TEAL } from "@/components/icons";

type Props = {
  onClose: () => void;
  onCreate: (
    title: string,
    aspectRatio: string,
    width: number,
    height: number,
    fps: number,
    backgroundColor: string,
  ) => Promise<void>;
};

const RESOLUTION_OPTIONS = [
  { label: "1920 × 1080 (16:9)", value: "16:9", width: 1920, height: 1080 },
  { label: "1280 × 720 (16:9)", value: "16:9", width: 1280, height: 720 },
  { label: "1080 × 1920 (9:16)", value: "9:16", width: 1080, height: 1920 },
  { label: "720 × 1280 (9:16)", value: "9:16", width: 720, height: 1280 },
  { label: "1080 × 1080 (1:1)", value: "1:1", width: 1080, height: 1080 },
  { label: "1440 × 1080 (4:3)", value: "4:3", width: 1440, height: 1080 },
];

const FRAME_RATES = [24, 25, 30, 60] as const;

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function getAspectRatioLabel(width: number, height: number): string {
  if (!width || !height) return "-";
  const d = gcd(width, height);
  return `${width / d}:${height / d}`;
}

export default function SidePanelProjectCreateModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState("Untitled Project");
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>("1920x1080");
  const [isCustomResolution, setIsCustomResolution] = useState(false);
  const [customWidth, setCustomWidth] = useState("1920");
  const [customHeight, setCustomHeight] = useState("1080");
  const [fps, setFps] = useState<number>(30);
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [creating, setCreating] = useState(false);

  const selectedPreset = RESOLUTION_OPTIONS.find(
    (option) => `${option.width}x${option.height}` === selectedPresetKey,
  );

  const finalWidth = isCustomResolution
    ? Number(customWidth) || 0
    : (selectedPreset?.width ?? 1920);

  const finalHeight = isCustomResolution
    ? Number(customHeight) || 0
    : (selectedPreset?.height ?? 1080);

  const finalAspectRatio = useMemo(() => {
    if (isCustomResolution) {
      return getAspectRatioLabel(finalWidth, finalHeight);
    }
    return selectedPreset?.value ?? "16:9";
  }, [isCustomResolution, finalWidth, finalHeight, selectedPreset]);

  const canCreate =
    !!title.trim() &&
    finalWidth > 0 &&
    finalHeight > 0;

  async function handleCreate() {
    if (!canCreate) return;

    try {
      setCreating(true);
      await onCreate(
        title.trim(),
        finalAspectRatio,
        finalWidth,
        finalHeight,
        fps,
        backgroundColor,
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.42)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 10px 30px rgba(0,0,0,0.16)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#222" }}>
            新しいプロジェクト
          </h2>

          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "transparent",
              color: "#999",
              cursor: "pointer",
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
            プロジェクト名
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Untitled Project"
            style={{
              width: "100%",
              padding: "10px 12px",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              outline: "none",
              color: "#333",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
            解像度
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {RESOLUTION_OPTIONS.map((option) => {
              const key = `${option.width}x${option.height}`;
              const active = !isCustomResolution && selectedPresetKey === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setIsCustomResolution(false);
                    setSelectedPresetKey(key);
                    setCustomWidth(String(option.width));
                    setCustomHeight(String(option.height));
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${active ? TEAL : "#e0e0e0"}`,
                    background: active ? `${TEAL}11` : "#fff",
                    color: active ? TEAL : "#444",
                    cursor: "pointer",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {option.label}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setIsCustomResolution(true)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "10px 12px",
                fontSize: 12,
                borderRadius: 8,
                border: `1px solid ${isCustomResolution ? TEAL : "#e0e0e0"}`,
                background: isCustomResolution ? `${TEAL}11` : "#fff",
                color: isCustomResolution ? TEAL : "#444",
                cursor: "pointer",
                fontWeight: isCustomResolution ? 600 : 400,
              }}
            >
              カスタム
            </button>
          </div>

          {isCustomResolution && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 24px 1fr",
                gap: 8,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <input
                type="number"
                min={1}
                value={customWidth}
                onChange={(e) => setCustomWidth(e.target.value)}
                placeholder="Width"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #e0e0e0",
                  outline: "none",
                  color: "#333",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ textAlign: "center", color: "#888", fontSize: 14 }}>×</div>
              <input
                type="number"
                min={1}
                value={customHeight}
                onChange={(e) => setCustomHeight(e.target.value)}
                placeholder="Height"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  fontSize: 13,
                  borderRadius: 8,
                  border: "1px solid #e0e0e0",
                  outline: "none",
                  color: "#333",
                  boxSizing: "border-box",
                }}
              />
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
            フレームレート
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {FRAME_RATES.map((value) => {
              const active = fps === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFps(value)}
                  style={{
                    padding: "8px 0",
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${active ? TEAL : "#e0e0e0"}`,
                    background: active ? `${TEAL}11` : "#fff",
                    color: active ? TEAL : "#555",
                    cursor: "pointer",
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {value} fps
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, color: "#666", fontWeight: 600 }}>
            背景色
          </label>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              style={{
                width: 44,
                height: 36,
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: 2,
                background: "#fff",
                cursor: "pointer",
              }}
            />
            <input
              type="text"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              style={{
                flex: 1,
                padding: "10px 12px",
                fontSize: 13,
                borderRadius: 8,
                border: "1px solid #e0e0e0",
                outline: "none",
                color: "#333",
              }}
            />
          </div>
        </div>

        <div
          style={{
            borderRadius: 10,
            border: "1px solid #ececec",
            background: "#fafafa",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 12,
            color: "#666",
          }}
        >
          <div>
            <strong style={{ color: "#333" }}>選択中:</strong> {finalWidth} × {finalHeight}
          </div>
          <div>
            <strong style={{ color: "#333" }}>比率:</strong> {finalAspectRatio}
          </div>
          <div>
            <strong style={{ color: "#333" }}>fps:</strong> {fps}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <strong style={{ color: "#333" }}>背景:</strong>
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 4,
                border: "1px solid #ddd",
                background: backgroundColor,
                display: "inline-block",
              }}
            />
            {backgroundColor}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={creating}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid #e0e0e0",
              background: "#fff",
              color: "#555",
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            キャンセル
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !canCreate}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 8,
              border: "none",
              background: creating || !canCreate ? "#cfcfcf" : TEAL,
              color: "#fff",
              cursor: creating || !canCreate ? "not-allowed" : "pointer",
            }}
          >
            {creating ? "作成中..." : "新規作成"}
          </button>
        </div>
      </div>
    </div>
  );
}