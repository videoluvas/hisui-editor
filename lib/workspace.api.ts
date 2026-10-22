export type ToolType = "conte" | "pptx";

export const TOOL_TYPE_LABEL: Record<ToolType, string> = {
  conte: "コンテ→動画化",
  pptx:  "パワーポイント→動画化",
};

export const TOOL_TYPE_DESC: Record<ToolType, { lead: string; points: string[] }> = {
  conte: {
    lead: "シーンごとのコンテを作り、AI で画像・動画・ナレーションを生成して動画にします。",
    points: ["台本やテーマからコンテを AI 作成", "シーンごとに画像・動画・ナレーションを生成", "サンプルのコンテ付きではじめられます"],
  },
  pptx: {
    lead: "PowerPoint のスライドを取り込み、オブジェクトごとに分けた動画プロジェクトを作ります。",
    points: [".pptx と PDF をアップロードするだけ", "フォント・配置・アニメーション・画面切り替えを反映", "オブジェクトを AI 画像・AI 動画に置き換え"],
  },
};

export type WorkspaceItem = {
  id: string;
  name: string;
  toolType: ToolType;
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

export async function createWorkspace(name: string, toolType: ToolType): Promise<{
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
    body: JSON.stringify({ name, toolType }),
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
