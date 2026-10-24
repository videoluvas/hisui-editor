// 失敗したときの案内（何が起きたか・何をすればよいか・問い合わせ先）。取り込みと書き出しで使う

export const SUPPORT_EMAIL = "info@hisui-ai.com";

export type ErrorAction = "pptx" | "pdf" | "retry" | "credits";

export type ErrorGuide = {
  title: string;
  steps: string[];
  action?: ErrorAction;    // 画面に出す次の操作（パワーポイント・PDF を選び直す など）
  note?: string;           // クレジットの扱いなど、補足
};

export const RETRY_THEN_CONTACT = "同じエラーが続く場合は、下の「問い合わせる」からご連絡ください。エラーコードと受付番号を添えていただくと調査が早くなります。";

const PDF_EXPORT_HOWTO = "Windows：ファイル → エクスポート → PDF/XPS ドキュメントの作成 →「オプション」で発行対象を「スライド」、範囲を「すべて」にして発行。Mac：ファイル → エクスポート → ファイル形式「PDF」→ エクスポート";

export const IMPORT_GUIDES: Record<string, ErrorGuide> = {
  SLIDE_COUNT_MISMATCH: {
    title: "スライドの枚数と PDF のページ数が合いません",
    steps: [
      "PDF が同じ .pptx から書き出したものか確認してください（古い版や別のファイルの PDF だと枚数がずれます）。",
      "PDF を書き出し直してください。" + PDF_EXPORT_HOWTO,
      "ノート付き・配布資料（1 ページに複数枚）の形式ではなく、「スライド」だけを書き出してください。",
      "非表示スライドがある場合は、書き出しのオプションで「非表示スライドを含める」のチェックを外してください。",
    ],
    action: "pdf",
  },
  PAGE_SIZE_MISMATCH: {
    title: "PDF の縦横比がスライドと合いません",
    steps: [
      "PDF が同じ .pptx から書き出したものか確認してください。",
      "スライドのサイズ（デザイン → スライドのサイズ）を変えた場合は、変えたあとに PDF を書き出し直してください。",
      "「印刷」→「PDF として保存」は用紙サイズ（A4 など）になるため使えません。「エクスポート」で書き出してください。" + PDF_EXPORT_HOWTO,
    ],
    action: "pdf",
  },
  INVALID_PPTX: {
    title: "パワーポイントファイルを読み込めませんでした",
    steps: [
      "PowerPoint でファイルが開けるか確認してください。",
      "パスワードや編集の制限がかかっている場合は、解除して保存し直してください。",
      "古い形式（.ppt）や Keynote・Google スライドから書き出したファイルは、PowerPoint で開いて「名前を付けて保存」で .pptx として保存し直してください。",
    ],
    action: "pptx",
  },
  INVALID_PDF: {
    title: "PDF を読み込めませんでした",
    steps: [
      "PDF にパスワードや保護がかかっていないか確認してください。",
      "PowerPoint から PDF を書き出し直してください。" + PDF_EXPORT_HOWTO,
    ],
    action: "pdf",
  },
  UPLOAD_FAILED: {
    title: "ファイルをアップロードできませんでした",
    steps: [
      "インターネットの接続を確認してください。",
      "会社のネットワークや VPN では、アップロードが止められることがあります。別のネットワークでもお試しください。",
      "少し時間をおいて、もう一度「取り込む」を押してください。",
    ],
    action: "retry",
  },
  WORKSPACE_FAILED: {
    title: "ワークスペースを作成できませんでした",
    steps: ["ページを再読み込みして、もう一度お試しください。", "すでにあるワークスペースを保存先に選んで取り込むこともできます。"],
    action: "retry",
  },
  START_FAILED: {
    title: "取り込みを開始できませんでした",
    steps: ["表示されている内容を確認してください。", "ログインが切れている場合は、ページを再読み込みしてログインし直してください。", "もう一度「取り込む」を押してください。"],
    action: "retry",
  },
  TIMEOUT: {
    title: "変換が時間内に終わりませんでした",
    steps: [
      "スライドの枚数が多い場合は、ファイルを分けて取り込んでください。",
      "大きな動画を埋め込んでいる場合は、PowerPoint の「メディアの圧縮」で小さくしてからお試しください。",
      "混み合っている可能性があります。少し時間をおいてもう一度お試しください。",
    ],
    action: "retry",
  },
  NARRATION_FAILED: {
    title: "ナレーションを生成できませんでした",
    steps: ["少し時間をおいて、もう一度お試しください。", "ナレーションなしで取り込み、あとから動画編集画面でナレーションを付けることもできます。"],
    action: "retry",
    note: "このとき消費したクレジット（無料プランは回数）は自動で戻しています。",
  },
  CONVERT_FAILED: {
    title: "変換中にエラーが発生しました",
    steps: [
      "もう一度「取り込む」を押してください。",
      "特定のスライドで失敗する場合は、そのスライドを複製・削除して取り込めるか試すと原因を絞り込めます。",
    ],
    action: "retry",
  },
};

export const EXPORT_GUIDES: Record<string, ErrorGuide> = {
  CREDIT_SHORT: {
    title: "クレジットが足りません",
    steps: ["クレジットの残高を確認してください。", "ウォーターマークありで書き出すと、クレジットを消費せずに書き出せます。"],
    action: "credits",
  },
  NOT_READY: {
    title: "プロジェクトの読み込み中です",
    steps: ["読み込みが終わってから、もう一度「書き出す」を押してください。"],
    action: "retry",
  },
  RENDER_START_FAILED: {
    title: "書き出しを開始できませんでした",
    steps: [
      "ファイル一覧から削除した画像・動画がタイムラインに残っていないか確認してください（削除した素材は使えません）。",
      "少し時間をおいて、もう一度お試しください。",
    ],
    action: "retry",
    note: "クレジットは消費されていません。",
  },
  RENDER_FAILED: {
    title: "動画の作成に失敗しました",
    steps: [
      "タイムラインに表示されない素材（真っ黒・読み込み中のまま）がないか確認し、あれば差し替えるか削除してください。",
      "埋め込み動画が WMV など書き出しで使えない形式の場合は、MP4 に変換して差し替えてください。",
      "もう一度「書き出す」を押してください。",
    ],
    action: "retry",
    note: "ウォーターマークなしで書き出してクレジットが消費された場合は、受付番号を添えてお問い合わせください。",
  },
  EXPORT_TIMEOUT: {
    title: "書き出しに時間がかかっています",
    steps: [
      "長い動画や素材が多い動画は、時間がかかることがあります。",
      "少し時間をおいて、もう一度「書き出す」を押してください。",
    ],
    action: "retry",
    note: "ウォーターマークなしで書き出し直すと、クレジットをもう一度消費します。気になる場合は先にお問い合わせください。",
  },
  EXPORT_FAILED: {
    title: "書き出しに失敗しました",
    steps: ["ページを再読み込みして、もう一度お試しください。", "ログインが切れている場合は、ログインし直してください。"],
    action: "retry",
  },
};

export function importGuide(code: string | null | undefined): ErrorGuide {
  return IMPORT_GUIDES[code ?? ""] ?? IMPORT_GUIDES.CONVERT_FAILED;
}

export function exportGuide(code: string | null | undefined): ErrorGuide {
  return EXPORT_GUIDES[code ?? ""] ?? EXPORT_GUIDES.EXPORT_FAILED;
}

// お問い合わせフォームを「不具合の報告」で開き、エラーコードと受付番号を本文に入れておく
export function contactUrl(code?: string | null, ref?: string | null, where?: string) {
  const q = new URLSearchParams({ topic: "bug" });
  if (code) q.set("code", code);
  if (ref) q.set("ref", ref);
  if (where) q.set("where", where);
  return `/contact?${q}`;
}

// エラーコードと受付番号を持たせて画面まで運ぶ
export class GuidedError extends Error {
  constructor(public code: string, message: string, public ref?: string) {
    super(message);
  }
}
