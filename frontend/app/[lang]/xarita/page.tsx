import type { Metadata } from "next";
import LiveMapLoader from "@/components/LiveMapLoader";
import { apiGet, type FeatureCollection, type InscriptionFeature, type MonumentFeature } from "@/lib/api";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.live.title, description: d.live.subtitle, alternates: { canonical: `/${lang}/xarita` } };
}

export default async function MapPage({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<{ bitik?: string; joy?: string }>;
}) {
  const lang = (await params).lang as Locale;
  const { bitik, joy } = await searchParams;
  const d = getDict(lang);
  const [ins, mons] = await Promise.all([
    apiGet<FeatureCollection<InscriptionFeature>>("/inscriptions/geojson/", 120),
    apiGet<FeatureCollection<MonumentFeature>>("/monuments/geojson/", 300),
  ]);

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <h1>{d.live.title}</h1>
          <p>{d.live.subtitle}</p>
        </div>
      </section>
      <div className="container" style={{ padding: "24px 20px 64px" }}>
        <LiveMapLoader
          lang={lang}
          d={d}
          inscriptions={ins?.features || []}
          monuments={mons?.features || []}
          focus={bitik}
          autostart={joy === "1"}
        />
      </div>
    </>
  );
}
