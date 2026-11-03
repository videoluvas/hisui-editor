import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "マニュアル | ヒスイAI",
  description: "ヒスイAIの使い方。パワーポイントの取り込みから動画編集、ナレーション、書き出しまでの操作をまとめています。",
  openGraph: {
    title: "マニュアル | ヒスイAI",
    description: "パワーポイントの取り込みから動画編集、ナレーション、書き出しまでの操作をまとめています。",
  },
};

export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return children;
}
