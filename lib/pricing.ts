// 仕様シート「価格案」の値。決済ができるまでは問い合わせ → メールで手続き
// プランの id は DB の users.plan の値：Free = 無料、Business = スタンダード、Pro = 法人
export const FREE_PLAN_CODE = "FREE_PLAN";

export const FREE_LIMITS = {
  pptxMB: 50,
  slides: 30,
  narrationImports: 3,
  narrationSlides: 30,
  narrationChars: 6_000,
  exports: 10,
  workspaces: 3,
};

export const STANDARD_LIMITS = {
  pptxMB: 200,
  narrationChars: 45_000,
  cleanExportMin: 60,
};

export const FREE_NARRATION_IMPORTS = FREE_LIMITS.narrationImports;

export const STANDARD_PLAN = {
  id: "standard", label: "スタンダード", price: 9_800, priceTaxIn: 10_780, forWhom: "個人・講師・研修担当の方",
  items: [
    `パワーポイントの取り込み ${STANDARD_LIMITS.pptxMB}MB・枚数無制限（動画も読み込み）`,
    `ナレーション 月 ${STANDARD_LIMITS.narrationChars.toLocaleString()} 字（約 150 分・ノートからの生成と編集画面での作り直し）`,
    "透かし入りの書き出し 無制限",
    `透かしなしの書き出し（1080p） 月 ${STANDARD_LIMITS.cleanExportMin} 分`,
    "ワークスペース 無制限",
  ],
};

export const FREE_ITEMS: [boolean, string][] = [
  [true, `パワーポイントの取り込み ${FREE_LIMITS.pptxMB}MB・${FREE_LIMITS.slides} 枚まで（動画は読み込みません）`],
  [true, `ノートからナレーション 累計 ${FREE_LIMITS.narrationImports} 回（1 回 ${FREE_LIMITS.narrationSlides} 枚・${FREE_LIMITS.narrationChars.toLocaleString()} 字まで）`],
  [true, `動画の書き出し 累計 ${FREE_LIMITS.exports} 回（透かし入り）`],
  [true, `ワークスペース ${FREE_LIMITS.workspaces} 個`],
  [false, "透かしなしの書き出し"],
  [false, "AI 生成（画像・動画・ナレーション・BGM・字幕）"],
];

export const CORPORATE_ITEMS = [
  "スタンダードのすべての機能（透かしなしの書き出し）",
  "AI 画像・動画・ナレーション・BGM の生成",
  "AI プロンプト編集・自動字幕・テロップ生成",
  "AI 絵コンテツール・AI アバターツール",
  "チームでの共同編集",
  "専門スタッフの導入・定期サポート",
  "ご要望に合わせた独自チューニング",
];

export const PLAN_LABEL: Record<string, string> = { Free: "無料プラン", Business: "スタンダード", Pro: "法人プラン" };
export const planLabel = (plan: string | null | undefined) => PLAN_LABEL[plan ?? "Free"] ?? plan ?? "無料プラン";

export const planContactUrl = (label: string) => `/contact?topic=plan&plan=${encodeURIComponent(label)}`;
export const CORPORATE_CONTACT_URL = "/contact?topic=enterprise";

export const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

const OPEN_EVENT = "hisui:open-pricing";
export const openPricing = () => window.dispatchEvent(new Event(OPEN_EVENT));
export const onOpenPricing = (fn: () => void) => {
  window.addEventListener(OPEN_EVENT, fn);
  return () => window.removeEventListener(OPEN_EVENT, fn);
};
