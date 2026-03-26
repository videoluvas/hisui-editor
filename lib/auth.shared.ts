export type BubbleAuthResponse = {
  ok: boolean;
  user_id?: string;
  name?: string;
  P_image?: string;
  plan?: string;
  message?: string;
};

export async function verifyEditorAuth(
  authCode: string,
  userId: string
): Promise<BubbleAuthResponse> {
  const res = await fetch(
    "https://hisui-ai.com/version-test/api/1.1/wf/verify_editor_auth",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_code: authCode,
        user_id: userId,
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    let message = "認証APIの呼び出しに失敗しました。";

    try {
      const errorData = await res.json();
      message =
        errorData?.response?.message ??
        errorData?.message ??
        `HTTP ${res.status}`;
    } catch {
      message = `HTTP ${res.status}`;
    }

    return {
      ok: false,
      message,
    };
  }

  const data = await res.json();
  return data.response ?? data;
}