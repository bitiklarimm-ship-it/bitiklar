import type { Metadata } from "next";
import Link from "next/link";
import HunterBoard from "@/components/HunterBoard";
import { apiGet, type FeatureCollection, type MonumentFeature } from "@/lib/api";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.hunter.title, description: d.hunter.subtitle };
}

export default async function HunterPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const geo = await apiGet<FeatureCollection<MonumentFeature>>("/monuments/geojson/", 600);
  const feats = (geo?.features || []).filter((f) => f.properties.inscriptions_count > 0);
  const cityTotals: Record<string, number> = {};
  feats.forEach((f) => { if (f.properties.city) cityTotals[f.properties.city] = (cityTotals[f.properties.city] || 0) + 1; });
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.hunter.title}</div>
          <h1>🏅 {d.hunter.title}</h1>
          <p>{d.hunter.subtitle}</p>
        </div>
      </section>
      <div className="container section">
        <HunterBoard total={feats.length} cityTotals={cityTotals} />
      </div>
    </>
  );
}
