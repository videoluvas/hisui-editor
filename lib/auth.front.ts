import {
  BubbleAuthResponse,
  verifyEditorAuth,
} from "@/lib/auth.shared";

export type EditorUser = {
  user_id: string;
  name: string;
  P_image: string;
  plan: string;
};

export function goToHisuiLogin() {
  window.location.href = "https://hisui-ai.com/editor-login";
}

export function getEditorAuthParamsFromUrl() {
  if (typeof window === "undefined") {
    return {
      authCode: null,
      userId: null,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    authCode: params.get("auth_code"),
    userId: params.get("user_id"),
  };
}

export function saveEditorUser(user: EditorUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem("editor_user", JSON.stringify(user));
}

export function getSavedEditorUser(): EditorUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("editor_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EditorUser;
  } catch {
    return null;
  }
}

export function clearEditorUser() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("editor_user");
}

export function clearAuthParamsFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("auth_code");
  url.searchParams.delete("user_id");

  const next =
    url.pathname +
    (url.search ? url.search : "") +
    (url.hash ? url.hash : "");

  window.history.replaceState({}, "", next);
}

export async function handleEditorAuthFromUrl(): Promise<BubbleAuthResponse | null> {
  const { authCode, userId } = getEditorAuthParamsFromUrl();

  if (!authCode || !userId) {
    return null;
  }

  const res = await fetch("/api/auth/bubble", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ auth_code: authCode, user_id: userId }),
  });

  const result: BubbleAuthResponse = await res.json();

  if (result.ok) {
    clearAuthParamsFromUrl();
  }

  return result;
}