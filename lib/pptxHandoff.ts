// スタートページで取り込みを終えたあと、編集画面で開くワークスペースとプロジェクトを渡す

const KEY = "hisui_open_project";
const TTL_MS = 10 * 60 * 1000;

type OpenProject = { workspaceId: string; projectId: string; savedAt: number };

export function setOpenProject(workspaceId: string, projectId: string) {
  try { localStorage.setItem(KEY, JSON.stringify({ workspaceId, projectId, savedAt: Date.now() })); } catch {}
}

function read(): OpenProject | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as OpenProject | null;
    return v && Date.now() - v.savedAt <= TTL_MS ? v : null;
  } catch {
    return null;
  }
}

export function peekOpenWorkspace(): string | null {
  return read()?.workspaceId ?? null;
}

export function takeOpenProject(workspaceId: string): string | null {
  const v = read();
  if (!v || v.workspaceId !== workspaceId) return null;
  try { localStorage.removeItem(KEY); } catch {}
  return v.projectId;
}
