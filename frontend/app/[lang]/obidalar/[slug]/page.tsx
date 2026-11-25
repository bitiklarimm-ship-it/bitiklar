import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CheckIn from "@/components/CheckIn";
import InscriptionCard from "@/components/InscriptionCard";
import PhotoSubmit from "@/components/PhotoSubmit";
import JsonLd, { SITE } from "@/components/JsonLd";
import Map3DButton from "@/components/Map3DButton";
import MapLoader from "@/components/MapLoader";
import { apiGet, PUBLIC_API, type Monument } from "@/lib/api";
import { getDict, label, LOCALES, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const m = await apiGet<Monument>(`/monuments/${slug}/`);
  if (!m) return {};
  const title = pick(m, "name", lang);
  const description = (pick(m, "description", lang) || `${m.city} · ${m.period}`).slice(0, 160);
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/obidalar/${slug}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/obidalar/${slug}`])),
    },
    openGraph: { type: "article", title, description, url: `/${lang}/obidalar/${slug}`, images: m.cover_url ? [{ url: m.cover_url, alt: title }] : [] },
    twitter: { card: m.cover_url ? "summary_large_image" : "summary", title, description },
  };
}

export default async function MonumentPage({ params }: P) {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const m = await apiGet<Monument>(`/monuments/${slug}/`);
  if (!m) notFound();
  const lat = Number(m.latitude), lng = Number(m.longitude);
  const desc = pick(m, "description", lang);
  const qrUrl = `${PUBLIC_API}/api/monuments/${m.slug}/qr/?lang=${lang}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LandmarksOrHistoricalBuildings",
    name: pick(m, "name", lang),
    url: `${SITE}/${lang}/obidalar/${m.slug}`,
    description: desc || undefined,
    image: m.cover_url || undefined,
    address: { "@type": "PostalAddress", addressLocality: m.city, streetAddress: m.address || undefined, addressCountry: "UZ" },
    geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    hasMap: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs">
            <Link href={`/${lang}`}>BITIKLAR</Link> / <Link href={`/${lang}/obidalar`}>{d.nav.monuments}</Link>
          </div>
          <h1>{pick(m, "name", lang)}</h1>
          <p>{label(d, "kind", m.kind)} · {m.city} · {pick(m.region, "name", lang)}{m.period ? ` · ${m.period}` : ""}</p>
        </div>
      </section>
      <div className="container detail">
        <div>
          {m.cover_url && (
            <div className="card block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.cover_url} alt={pick(m, "name", lang)} style={{ width: "100%" }} />
            </div>
          )}
          {desc && (
            <div className="block">
              <h2>{d.monument.description}</h2>
              <div className="prose">{desc}</div>
            </div>
          )}
          <div className="block">
            <h2>{d.monument.list} ({m.inscriptions?.length || 0})</h2>
            <div className="grid grid-2">
              {(m.inscriptions || []).map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
            </div>
          </div>
        </div>
        <aside>
          <div className="block">
            <MapLoader className="map-mini" points={[{ lat, lng, title: pick(m, "name", lang) }]} />
            <div className="map-actions">
              <Map3DButton lat={lat} lng={lng} title={pick(m, "name", lang)} />
              <Link href={`/${lang}/xarita`} className="btn btn-outline btn-sm">📍 {d.live.title}</Link>
            </div>
          </div>
          <div className="block">
            <CheckIn monument={{ slug: m.slug, name_uz: m.name_uz, name_ru: m.name_ru, name_en: m.name_en, city: m.city, lat, lng }} />
          </div>
          <div className="block">
            <PhotoSubmit monument={m.slug} />
          </div>
          <div className="card card-body block">
            <dl className="meta-list">
              <div><dt>{d.monument.period}</dt><dd>{m.period || d.inscription.unknown}</dd></div>
              <div><dt>{d.monument.city}</dt><dd>{m.address || m.city}</dd></div>
              <div><dt>{d.inscription.gps}</dt><dd>{lat.toFixed(5)}, {lng.toFixed(5)}</dd></div>
            </dl>
          </div>
          <div className="card card-body">
            <h3>{d.inscription.qr}</h3>
            <div className="qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR" />
              <div>
                <p className="muted" style={{ fontSize: ".9rem" }}>{d.inscription.qrHint}</p>
                <a className="btn btn-outline" href={qrUrl} download={`bitiklar-${m.slug}.png`}>{d.inscription.download}</a>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
