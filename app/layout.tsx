import "./globals.css";
import type { Metadata } from "next";

const FAVICON_BASE = "https://assets.hisui-ai.com/system/img/favicons";

export const metadata: Metadata = {
  title: "ヒスイAI",
  description: "AIを活用した動画・画像・ナレーション編集ツール",
  icons: {
    icon: [
      { url: `${FAVICON_BASE}/favicon.ico`,       sizes: "any" },
      { url: `${FAVICON_BASE}/favicon-16x16.png`, sizes: "16x16", type: "image/png" },
      { url: `${FAVICON_BASE}/favicon-32x32.png`, sizes: "32x32", type: "image/png" },
      { url: `${FAVICON_BASE}/favicon-48x48.png`, sizes: "48x48", type: "image/png" },
      { url: `${FAVICON_BASE}/favicon-64x64.png`, sizes: "64x64", type: "image/png" },
    ],
    apple: { url: `${FAVICON_BASE}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    other: [
      { rel: "icon", url: `${FAVICON_BASE}/favicon-128x128.png`, sizes: "128x128", type: "image/png" },
      { rel: "icon", url: `${FAVICON_BASE}/favicon-256x256.png`, sizes: "256x256", type: "image/png" },
      { rel: "icon", url: `${FAVICON_BASE}/android-chrome-192x192.png`, sizes: "192x192", type: "image/png" },
      { rel: "icon", url: `${FAVICON_BASE}/android-chrome-512x512.png`, sizes: "512x512", type: "image/png" },
      { rel: "msapplication-TileImage", url: `${FAVICON_BASE}/mstile-144x144.png` },
    ],
  },
};

// 装飾テロップ Canvas 向け Google Fonts ── 2リンクに分割（URL長対策）
const GF_BASE = "https://fonts.googleapis.com/css2?family=";

const GF_GOTHIC =
  GF_BASE +
  [
    // ゴシック
    "Noto+Sans+JP:wght@300;400;700;900",
    "BIZ+UDPGothic:wght@400;700",
    "M+PLUS+1p:wght@400;700;800;900",
    "Zen+Kaku+Gothic+New:wght@400;500;700;900",
    "Zen+Kaku+Gothic+Antique:wght@300;400;500;700;900",
    "Murecho:wght@300;400;700",
    // 丸ゴシック・ポップ
    "M+PLUS+Rounded+1c:wght@400;700",
    "Hachi+Maru+Pop",
    "Kiwi+Maru:wght@300;400;500",
    "Potta+One",
    // インパクト・デザイン
    "Dela+Gothic+One",
    "Rampart+One",
    "Reggae+One",
    "Rocknroll+One",
    "Stick",
    "Train+One",
    "DotGothic16",
  ].join("&family=") +
  "&display=swap";

const GF_MINCHO =
  GF_BASE +
  [
    // 明朝
    "Noto+Serif+JP:wght@400;600;700",
    "BIZ+UDMincho:wght@400;700",
    "Shippori+Mincho:wght@400;500;600;700;800",
    "Shippori+Mincho+B1:wght@400;500;600;700;800",
    "Kaisei+Decol:wght@400;700",
    "Kaisei+HarunoUmi:wght@400;700",
    "Kaisei+Tokumin:wght@400;500;700;800",
    "Zen+Old+Mincho:wght@400;500;600;700;900",
    "Yuji+Syuku",
    "Yuji+Mai",
    "Yomogi",
    "Klee+One:wght@400;600",
  ].join("&family=") +
  "&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={GF_GOTHIC}  rel="stylesheet" />
        <link href={GF_MINCHO}  rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
