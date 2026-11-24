import type { MetadataRoute } from "next";
import { apiGet, type InscriptionListItem, type Monument, type Paginated } from "@/lib/api";
import { LOCALES } from "@/lib/i18n";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://bitiklar.uz";
  const [ins, mons] = await Promise.all([
    apiGet<Paginated<InscriptionListItem>>("/inscriptions/?page_size=200", 3600),
    apiGet<Paginated<Monument>>("/monuments/?page_size=200", 3600),
  ]);
  const pages = ["", "/bitiklar", "/obidalar", "/xarita", "/haqida"];
  const out: MetadataRoute.Sitemap = [];
  for (const l of LOCALES) {
    pages.forEach((p) => out.push({ url: `${site}/${l}${p}` }));
    (ins?.results || []).forEach((i) => out.push({ url: `${site}/${l}/bitiklar/${i.slug}` }));
    (mons?.results || []).forEach((m) => out.push({ url: `${site}/${l}/obidalar/${m.slug}` }));
  }
  return out;
}
