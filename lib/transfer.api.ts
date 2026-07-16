async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: false, message: `サーバーエラー (${res.status})` }; }
}

export type TransferResourceType = "workspace" | "storyboard" | "project";

export type TransferInfo = {
  resourceType: TransferResourceType;
  resourceId:   string;
  resourceName: string;
  fromUserName: string | null;
  toEmail:      string;
  expiresAt:    string;
};

export async function getTransferInfo(token: string): Promise<{ ok: boolean; transfer?: TransferInfo; message?: string }> {
  const res = await fetch(`/api/transfer/${token}`, { cache: "no-store" });
  return safeJson(res);
}

export async function requestTransfer(body: {
  resourceType: TransferResourceType;
  resourceId:   string;
  toEmail:      string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/transfer/request", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return safeJson(res);
}

export async function acceptTransfer(
  token: string,
  targetWorkspaceId?: string,
): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch(`/api/transfer/${token}/accept`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetWorkspaceId }),
  });
  return safeJson(res);
}
