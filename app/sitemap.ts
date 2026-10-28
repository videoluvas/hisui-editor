import type { MetadataRoute } from "next";

const SITE_URL = "https://hisui-ai.com";

// 検索に出したい公開ページ（/ は編集画面なので載せない）
const PAGES: [string, number][] = [
  ["/powerpoint", 1],
  ["/pricing", 0.8],
  ["/manual", 0.6],
  ["/contact", 0.5],
  ["/terms", 0.2],
  ["/privacy", 0.2],
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(([path, priority]) => ({ url: `${SITE_URL}${path}`, lastModified: new Date(), priority }));
}
