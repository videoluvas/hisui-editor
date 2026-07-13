export type Project = {
  id: string;
  title: string;
  status: string;
  thumbnailUrl: string | null;
  aspectRatio: string | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  backgroundColor: string | null;
  editJsonKey: string | null;
  durationSec: number | null;
  createdAt: string;
  updatedAt: string;
};

export async function getProjects(workspaceId?: string | null): Promise<{ ok: boolean; projects?: Project[]; message?: string }> {
  const url = workspaceId ? `/api/projects?workspaceId=${workspaceId}` : "/api/projects";
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export async function getProjectEditJson(projectId: string): Promise<{ ok: boolean; editJson?: unknown; message?: string }> {
  const res = await fetch(`/api/projects/${projectId}/edit`, { cache: "no-store" });
  return res.json();
}

export async function createProject(
  title?: string,
  aspectRatio?: string,
  width?: number,
  height?: number,
  fps?: number,
  backgroundColor?: string,
  workspaceId?: string | null,
) {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, aspectRatio, width, height, fps, backgroundColor, workspaceId }),
  });
  return res.json();
}

export async function saveProjectEditJson(projectId: string, editJson: unknown): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/projects", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, editJson }),
  });
  return res.json();
}

export async function deleteProject(projectId: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/projects", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });
  return res.json();
}