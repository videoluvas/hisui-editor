export const FREE_NARRATION_IMPORTS = 3;
export const FREE_PLAN_CODE = "FREE_PLAN";

// 仕様シート「料金設計 2. プラン案」の値。決済ができるまでは問い合わせ → メールで手続き
export const PAID_PLANS = [
  {
    id: "standard", label: "スタンダード", price: 2_980, yearly: 29_800, forWhom: "個人・講師・小さなチーム",
    items: ["書き出し 月 60 分（1080p・透かしなし）", "ナレーション 月 18,000 字（約 60 分）", "AI クレジット 月 30,000（AI 画像 6 枚 または AI 動画 6 秒）", "ワークスペース 10 個まで"],
  },
  {
    id: "pro", label: "プロ", price: 9_800, yearly: 98_000, forWhom: "研修・営業資料を毎月作る法人の担当者",
    items: ["書き出し 月 180 分（1080p・透かしなし）", "ナレーション 月 45,000 字（約 150 分）", "AI クレジット 月 200,000（AI 画像 40 枚 または AI 動画 40 秒）", "ワークスペース 無制限"],
  },
];

export const SPECIAL_ITEMS = ["AI アバター", "多彩な学習モデル", "AI 絵コンテツール", "専門スタッフによる技術サポート", "チームでの共同編集"];

export const planContactUrl = (label: string) => `/contact?topic=plan&plan=${encodeURIComponent(label)}`;
export const SPECIAL_CONTACT_URL = "/contact?topic=enterprise";

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

const OPEN_EVENT = "hisui:open-pricing";
export const openPricing = () => window.dispatchEvent(new Event(OPEN_EVENT));
export const onOpenPricing = (fn: () => void) => {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
};
