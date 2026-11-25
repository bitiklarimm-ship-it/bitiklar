/** Qidiruv tizimlari uchun tuzilgan ma'lumot (schema.org, JSON-LD). */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  // "<" belgisini qochiramiz — skript ichida HTML yopilib qolmasligi uchun
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://bitiklar.uz").replace(/\/$/, "");
