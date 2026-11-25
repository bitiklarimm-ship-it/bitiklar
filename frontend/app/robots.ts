import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bitiklar.uz";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/uz/tadqiqotchilar", "/ru/tadqiqotchilar", "/en/tadqiqotchilar", "/uz/qr-chop", "/ru/qr-chop", "/en/qr-chop", "/admin/", "/api/export/"] }],
    sitemap: `${site}/sitemap.xml`,
  };
}
