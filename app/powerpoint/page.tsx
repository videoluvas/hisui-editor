import type { Metadata } from "next";
import PowerpointStart from "@/components/PowerpointStart";

export const metadata: Metadata = {
  title: "パワーポイントを動画に | ヒスイAI",
  description: "PowerPoint のスライドを読み込むだけで、文字・画像・図形をオブジェクトごとに分けた動画プロジェクトを作ります。フォントもレイアウトもそのまま。",
  openGraph: {
    title: "パワーポイントを動画に | ヒスイAI",
    description: "PowerPoint のスライドを読み込むだけで、オブジェクトごとに動く動画プロジェクトを作ります。",
  },
};

export default function PowerpointPage() {
  return <PowerpointStart />;
}
