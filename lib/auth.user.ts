"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  bubbleUserId: string;
  name: string | null;
  plan: string | null;
  iconUrl: string | null;
};

type MeApiResponse = {
  ok: boolean;
  message?: string;
  user?: AuthUser;
};

type UseAuthUserResult = {
  user: AuthUser | null;
  loading: boolean;
  isLoggedIn: boolean;
  refreshUser: () => Promise<void>;
  logoutUser: () => Promise<boolean>;
};

export function useAuthUser(): UseAuthUserResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data: MeApiResponse = await res.json();

      if (res.ok && data.ok && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("useAuthUser refreshUser error:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setUser(null);
        return true;
      }

      return false;
    } catch (error) {
      console.error("useAuthUser logoutUser error:", error);
      return false;
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return {
    user,
    loading,
    isLoggedIn: !!user,
    refreshUser,
    logoutUser,
  };
}