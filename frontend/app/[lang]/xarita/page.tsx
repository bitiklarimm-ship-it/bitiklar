import type { Metadata } from "next";
import MapLoader from "@/components/MapLoader";
import { apiGet } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

type GeoJSON = {
  features: { geometry: { coordinates: [number, number] }; properties: Record<string, any> }[];
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).map.title };
}

export default async function MapPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const geo = await apiGet<GeoJSON>("/monuments/geojson/", 300);
  const points = (geo?.features || []).map((f) => ({
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    title: pick(f.properties, "name", lang),
    subtitle: `${label(d, "kind", f.properties.kind)} · ${f.properties.city} · ${f.properties.inscriptions_count} ${d.monument.inscriptions}`,
    href: `/${lang}/obidalar/${f.properties.slug}`,
    count: f.properties.inscriptions_count,
    linkLabel: `${d.map.open} →`,
  }));

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <h1>{d.map.title}</h1>
          <p>{d.map.subtitle}</p>
        </div>
      </section>
      <div className="container" style={{ padding: "28px 20px 64px" }}>
        <MapLoader points={points} />
      </div>
    </>
  );
}
