export type WorkspaceItem = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { ok: false, message: `サーバーエラー (${res.status})` };
  }
}

export async function listWorkspaces(): Promise<{ ok: boolean; workspaces: WorkspaceItem[]; message?: string }> {
  const res = await fetch("/api/workspace", { credentials: "include", cache: "no-store" });
  const data = await safeJson(res);
  return { ok: false, workspaces: [], ...data };
}

export type SampleProject = {
  id: string; title: string; status: string; thumbnailUrl: string | null;
  aspectRatio: string | null; width: number | null; height: number | null;
  fps: number | null; backgroundColor: string | null; editJsonKey: string | null;
  durationSec: number | null; createdAt: string; updatedAt: string;
};

export async function createWorkspace(name: string): Promise<{
  ok: boolean;
  workspace?: WorkspaceItem;
  sampleStoryboardId?: string | null;
  sampleProject?: SampleProject | null;
  message?: string;
}> {
  const res = await fetch("/api/workspace", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return safeJson(res);
}

export async function updateWorkspace(id: string, name: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/workspace/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  return safeJson(res);
}

export async function deleteWorkspace(id: string): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/workspace/${id}`, { method: "DELETE", credentials: "include" });
  return safeJson(res);
}
