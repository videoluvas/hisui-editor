import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ログイン・無料アカウント作成 | ヒスイAI",
  robots: { index: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
