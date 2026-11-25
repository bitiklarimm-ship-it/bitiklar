import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MapLoader from "@/components/MapLoader";
import { apiGet, type Route } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  const r = await apiGet<Route>(`/routes/${slug}/`);
  if (!r) return {};
  const l = lang as Locale;
  return {
    title: pick(r, "title", l),
    description: pick(r, "description", l).slice(0, 160),
    alternates: { canonical: `/${l}/yonalishlar/${slug}` },
    openGraph: { title: pick(r, "title", l), images: r.cover_url ? [r.cover_url] : [] },
  };
}

export default async function RoutePage({ params }: P) {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const r = await apiGet<Route>(`/routes/${slug}/`, 120);
  if (!r) notFound();
  const stops = r.stops || [];
  const points = stops.map((s, i) => ({
    lat: Number(s.monument.latitude),
    lng: Number(s.monument.longitude),
    title: `${i + 1}. ${pick(s.monument, "name", lang)}`,
    subtitle: pick(s, "note", lang) || s.monument.city,
    href: `/${lang}/obidalar/${s.monument.slug}`,
    linkLabel: `${d.map.open} →`,
    count: i + 1,
  }));
  const desc = pick(r, "description", lang);
  const first = stops[0]?.monument;

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs">
            <Link href={`/${lang}`}>BITIKLAR</Link> / <Link href={`/${lang}/yonalishlar`}>{d.routes.title}</Link>
          </div>
          <h1>{pick(r, "title", lang)}</h1>
          <p>
            {r.region ? pick(r.region, "name", lang) : ""}
            {r.duration ? ` · ${d.routes.duration}: ${r.duration}` : ""} · {stops.length} {d.routes.stops}
          </p>
        </div>
      </section>
      <div className="container detail">
        <div>
          {desc && <div className="block prose">{desc}</div>}
          <ol className="route-stops">
            {stops.map((s, i) => (
              <li key={s.id} className="card card-body">
                <span className="route-num">{i + 1}</span>
                <div>
                  <h3><Link href={`/${lang}/obidalar/${s.monument.slug}`}>{pick(s.monument, "name", lang)}</Link></h3>
                  <div className="ins-meta">
                    {label(d, "kind", s.monument.kind)} · {s.monument.city}
                    {s.monument.period ? ` · ${s.monument.period}` : ""} · {s.monument.inscriptions_count} {d.monument.inscriptions}
                  </div>
                  {pick(s, "note", lang) && <p style={{ marginTop: 8 }}>{pick(s, "note", lang)}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
        <aside>
          <div className="block">
            <MapLoader className="map-wrap route-map" points={points} line />
          </div>
          {first && (
            <Link href={`/${lang}/xarita`} className="btn btn-dark" style={{ width: "100%", justifyContent: "center" }}>
              📍 {d.routes.start}
            </Link>
          )}
        </aside>
      </div>
    </>
  );
}
