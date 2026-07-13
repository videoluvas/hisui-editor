export type UploadResult = {
  ok: boolean;
  fileId?: string;
  fileUrl?: string;
  message?: string;
};

export type PresignResult = {
  ok: boolean;
  presignedUrl?: string;
  fileId?: string;
  fileUrl?: string;
  message?: string;
};

export async function getPresignedUrl(file: File, projectId?: string, workspaceId?: string | null): Promise<PresignResult> {
  try {
    const res = await fetch("/api/fileupload/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        projectId,
        workspaceId,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return { ok: false, message: data.message ?? "アップロードURLの取得に失敗しました" };
    }

    return {
      ok: true,
      presignedUrl: data.presignedUrl,
      fileId: data.fileId,
      fileUrl: data.fileUrl,
    };
  } catch (error) {
    console.error("getPresignedUrl error:", error);
    return { ok: false, message: "予期しないエラーが発生しました" };
  }
}

export async function uploadFile(file: File, projectId?: string): Promise<UploadResult> {
  try {
    const data = await getPresignedUrl(file, projectId);

    if (!data.ok || !data.presignedUrl) {
      return { ok: false, message: data.message ?? "アップロードURLの取得に失敗しました" };
    }

    const uploadRes = await fetch(data.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!uploadRes.ok) {
      return { ok: false, message: "ファイルのアップロードに失敗しました" };
    }

    return {
      ok: true,
      fileId: data.fileId,
      fileUrl: data.fileUrl,
    };
  } catch (error) {
    console.error("uploadFile error:", error);
    return { ok: false, message: "予期しないエラーが発生しました" };
  }
}

export async function getMyFiles(projectId?: string, workspaceId?: string | null) {
  const params = new URLSearchParams();
  if (workspaceId) params.set("workspaceId", workspaceId);
  else if (projectId) params.set("projectId", projectId);
  const qs = params.toString();
  const res = await fetch(qs ? `/api/fileupload/list?${qs}` : "/api/fileupload/list", {
    credentials: "include",
    cache: "no-store",
  });
  return res.json();
}