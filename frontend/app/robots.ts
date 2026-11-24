import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bitiklar.uz";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/uz/tadqiqotchilar", "/ru/tadqiqotchilar", "/en/tadqiqotchilar"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
