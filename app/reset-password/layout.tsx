import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "パスワードの再設定 | ヒスイAI",
  robots: { index: false },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
