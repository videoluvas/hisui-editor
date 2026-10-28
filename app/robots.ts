import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/auth", "/transfer/", "/reset-password"] },
    sitemap: "https://hisui-ai.com/sitemap.xml",
  };
}
