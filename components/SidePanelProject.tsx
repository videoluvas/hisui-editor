"use client";

import { useEffect, useState } from "react";
import { getProjects, createProject, deleteProject, Project } from "@/lib/project.api";
import { TEAL } from "@/components/icons";
import SidePanelProjectCreateModal from "@/components/SidePanelProjectCreateModal";

const SEQ_COLOR = "#7F5AF0";
const FONT = "'Noto Sans JP', sans-serif";

function SequenceIcon({ color = SEQ_COLOR }: { color?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <line x1="5" y1="3" x2="5" y2="13" />
      <line x1="11" y1="3" x2="11" y2="13" />
      <line x1="1" y1="6.5" x2="5" y2="6.5" strokeWidth="1" />
      <line x1="1" y1="9.5" x2="5" y2="9.5" strokeWidth="1" />
      <line x1="11" y1="6.5" x2="15" y2="6.5" strokeWidth="1" />
      <line x1="11" y1="9.5" x2="15" y2="9.5" strokeWidth="1" />
    </svg>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}

type SidePanelProjectProps = {
  selectedProjectId?: string | null;
  onSelectProject?: (project: Project | null) => void;
  workspaceId?: string | null;
};

export default function SidePanelProject({
  selectedProjectId,
  onSelectProject,
  workspaceId,
}: SidePanelProjectProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, [workspaceId]);

  async function fetchProjects() {
    setLoading(true);
    const res = await getProjects(workspaceId);
    if (res.ok && res.projects) {
      setProjects(res.projects);
      if (res.projects.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const projectIdFromUrl = params.get("project");
        const target = projectIdFromUrl
          ? res.projects.find((p) => p.id === projectIdFromUrl) ?? res.projects[0]
          : res.projects[0];
        onSelectProject?.(target);
      }
    }
    setLoading(false);
  }

  async function handleCreate(
    title: string,
    aspectRatio: string,
    width: number,
    height: number,
    fps: number,
    backgroundColor: string,
  ) {
    const res = await createProject(title, aspectRatio, width, height, fps, backgroundColor, workspaceId);
    if (res.ok && res.project) {
      setProjects((prev) => [res.project, ...prev]);
      onSelectProject?.(res.project);
    }
    setShowModal(false);
  }

  async function handleDelete(projectId: string) {
    if (!confirm("プロジェクトを削除しますか？")) return;
    const res = await deleteProject(projectId);
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProjectId === projectId) {
        onSelectProject?.(null);
      }
    }
  }

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: FONT }}>
        <button
          onClick={() => setShowModal(true)}
          style={{
            width: "100%",
            padding: "8px 0",
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 8,
            border: `1px solid ${TEAL}`,
            background: `${TEAL}11`,
            color: TEAL,
            cursor: "pointer",
            fontFamily: FONT,
          }}
        >
          + 新しいプロジェクト
        </button>

        {loading ? (
          <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 24 }}>
            読み込み中...
          </div>
        ) : projects.length === 0 ? (
          <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 24 }}>
            プロジェクトがありません
          </div>
        ) : (
          projects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            const color = SEQ_COLOR;
            const meta = [
              project.width && project.height ? `${project.width}×${project.height}` : null,
              project.fps ? `${project.fps}fps` : null,
            ].filter(Boolean).join(" · ");

            return (
              <div
                key={project.id}
                onClick={() => onSelectProject?.(project)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${isSelected ? `${color}55` : "#ebebeb"}`,
                  background: isSelected ? `${color}09` : "#fafafa",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
              >
                {/* アイコン + バッジ */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, paddingTop: 1 }}>
                  <span style={{ display: "flex", opacity: isSelected ? 1 : 0.55 }}>
                    <SequenceIcon color={color} />
                  </span>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: "1px 5px", borderRadius: 3, background: `${color}18`, color, fontFamily: FONT }}>
                    SEQ
                  </span>
                </div>

                {/* タイトル + メタ */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? color : "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>
                      {project.title}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", padding: 2, flexShrink: 0, display: "flex", alignItems: "center" }}
                      title="削除"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h8M4.5 3V2h3v1M4 3v6a.5.5 0 0 0 .5.5h3A.5.5 0 0 0 8 9V3" />
                      </svg>
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3, fontFamily: FONT }}>
                    {meta ? `${meta} · ` : ""}{fmtDate(project.updatedAt ?? project.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <SidePanelProjectCreateModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreate}
        />
      )}
    </>
  );
}
