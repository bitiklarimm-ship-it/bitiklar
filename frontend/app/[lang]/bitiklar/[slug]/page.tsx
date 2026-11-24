import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Gallery from "@/components/Gallery";
import MapLoader from "@/components/MapLoader";
import { apiGet, PUBLIC_API, type Inscription } from "@/lib/api";
import { getDict, label, LOCALES, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const it = await apiGet<Inscription>(`/inscriptions/${slug}/`);
  if (!it) return {};
  const title = `${pick(it, "title", lang)} — ${pick(it.monument, "name", lang)}`;
  return {
    title,
    description: pick(it, "translation", lang).slice(0, 160),
    openGraph: { title, images: it.images[0] ? [it.images[0].url] : [] },
  };
}

export default async function InscriptionPage({ params }: P) {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const t = d.inscription;
  const it = await apiGet<Inscription>(`/inscriptions/${slug}/`, 60);
  if (!it) notFound();

  const lat = Number(it.lat), lng = Number(it.lng);
  const qrUrl = `${PUBLIC_API}/api/inscriptions/${it.slug}/qr/?lang=${lang}`;
  // Joriy til tarjimasi birinchi
  const order = [lang, ...LOCALES.filter((l) => l !== lang)];
  const names: Record<Locale, string> = { uz: "O'ZBEKCHA", ru: "РУССКИЙ", en: "ENGLISH" };
  const commentary = pick(it, "commentary", lang);
  const placement = pick(it, "placement", lang);

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs">
            <Link href={`/${lang}`}>BITIKLAR</Link> / <Link href={`/${lang}/bitiklar`}>{d.nav.catalog}</Link> /{" "}
            <Link href={`/${lang}/obidalar/${it.monument.slug}`}>{pick(it.monument, "name", lang)}</Link>
          </div>
          <h1>{pick(it, "title", lang)}</h1>
          <p>
            {pick(it.monument, "name", lang)}
            {it.monument.city ? ` · ${it.monument.city}` : ""}
            {it.period_text ? ` · ${it.period_text}` : ""}
          </p>
        </div>
      </section>

      <div className="container detail">
        <div>
          <div className="block">
            <Gallery images={it.images} fallbackText={it.original_text.slice(0, 80)} noImage={t.noImage} />
          </div>

          <div className="block">
            <div className="kicker">{t.original}</div>
            <div className="original" lang={it.language === "persian" ? "fa" : it.language === "arabic" ? "ar" : undefined}>
              {it.original_text}
            </div>
          </div>

          {it.transliteration && (
            <div className="block">
              <div className="kicker">{t.transliteration}</div>
              <p className="translit">{it.transliteration}</p>
            </div>
          )}

          <div className="block">
            <h2>{t.translations}</h2>
            {order.map((l) => {
              const text = (it as any)[`translation_${l}`] as string;
              return text ? (
                <div key={l} className={`tr-block ${l === lang ? "current" : ""}`} lang={l}>
                  <small>{names[l]}</small>
                  {text}
                </div>
              ) : null;
            })}
          </div>

          {commentary && (
            <div className="block">
              <h2>{t.commentary}</h2>
              <div className="prose">{commentary}</div>
            </div>
          )}

          <div className="block">
            <h2>{t.sources}</h2>
            {it.sources.length ? (
              <ol className="sources">
                {it.sources.map((s) => (
                  <li key={s.id}>
                    {s.citation}{s.pages ? `, ${t.pages} ${s.pages}` : ""}
                    {s.url && <> — <a href={s.url} target="_blank" rel="noopener noreferrer">{s.url.replace(/^https?:\/\//, "").slice(0, 50)}</a></>}
                  </li>
                ))}
              </ol>
            ) : <p className="muted">{t.noSources}</p>}
          </div>
        </div>

        <aside>
          <div className="card card-body block">
            <dl className="meta-list">
              <div><dt>{t.monument}</dt><dd><Link href={`/${lang}/obidalar/${it.monument.slug}`}>{pick(it.monument, "name", lang)}</Link></dd></div>
              {placement && <div><dt>{t.placement}</dt><dd>{placement}</dd></div>}
              <div><dt>{t.language}</dt><dd>{label(d, "language", it.language)}</dd></div>
              <div><dt>{t.script}</dt><dd>{label(d, "script", it.script)}</dd></div>
              <div><dt>{t.technique}</dt><dd>{label(d, "technique", it.technique)}</dd></div>
              <div><dt>{t.period}</dt><dd>{it.period_text || (it.year_from ? `${it.year_from}${it.year_to ? `–${it.year_to}` : ""}` : t.unknown)}</dd></div>
              {it.hijri_date && <div><dt>{t.hijri}</dt><dd>{it.hijri_date}</dd></div>}
              <div><dt>{t.calligrapher}</dt><dd>{it.calligrapher || t.unknown}</dd></div>
              <div><dt>{t.gps}</dt><dd>{lat.toFixed(5)}, {lng.toFixed(5)}<br />
                <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noopener noreferrer">{t.openMap} ↗</a></dd></div>
            </dl>
          </div>

          <div className="block">
            <MapLoader className="map-mini" points={[{ lat, lng, title: pick(it.monument, "name", lang) }]} />
          </div>

          <div className="card card-body block">
            <h3>{t.qr}</h3>
            <div className="qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR" />
              <div>
                <p className="muted" style={{ fontSize: ".9rem" }}>{t.qrHint}</p>
                <a className="btn btn-outline" href={qrUrl} download={`bitiklar-${it.slug}.png`}>{t.download}</a>
              </div>
            </div>
          </div>

          <Link href={`/${lang}/tadqiqotchilar?bitik=${it.slug}`} className="btn btn-dark" style={{ width: "100%", justifyContent: "center" }}>
            ✎ {t.suggest}
          </Link>

          {!!it.related.length && (
            <div className="card card-body block" style={{ marginTop: 20 }}>
              <h3>{t.related}</h3>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {it.related.map((r) => (
                  <li key={r.slug}><Link href={`/${lang}/bitiklar/${r.slug}`}>{pick(r, "title", lang)}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}
