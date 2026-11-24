import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InscriptionCard from "@/components/InscriptionCard";
import MapLoader from "@/components/MapLoader";
import { apiGet, PUBLIC_API, type Monument } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const m = await apiGet<Monument>(`/monuments/${slug}/`);
  return m ? { title: pick(m, "name", lang), description: pick(m, "description", lang).slice(0, 160) } : {};
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

  return (
    <>
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
