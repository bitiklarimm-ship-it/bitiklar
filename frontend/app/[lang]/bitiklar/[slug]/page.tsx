import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AiGuide from "@/components/AiGuide";
import CitationBox from "@/components/CitationBox";
import ReadAloud from "@/components/ReadAloud";
import ReaderTools from "@/components/ReaderTools";
import CompareButton from "@/components/CompareButton";
import MoreLanguages from "@/components/MoreLanguages";
import PhotoSubmit from "@/components/PhotoSubmit";
import Gallery from "@/components/Gallery";
import JsonLd, { SITE } from "@/components/JsonLd";
import LocationCard from "@/components/LocationCard";
import MapLoader from "@/components/MapLoader";
import ShareBar from "@/components/ShareBar";
import { apiGet, PUBLIC_API, type Inscription } from "@/lib/api";
import { getDict, label, LOCALES, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const it = await apiGet<Inscription>(`/inscriptions/${slug}/`);
  if (!it) return {};
  const title = `${pick(it, "title", lang)} — ${pick(it.monument, "name", lang)}`;
  const description = (pick(it, "translation", lang) || pick(it, "commentary", lang) || it.original_text).slice(0, 160);
  return {
    title,
    description,
    alternates: {
      canonical: `/${lang}/bitiklar/${slug}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/bitiklar/${slug}`])),
    },
    openGraph: {
      type: "article", title, description, url: `/${lang}/bitiklar/${slug}`,
      images: it.images[0] ? [{ url: it.images[0].url, alt: title }] : [],
    },
    twitter: { card: it.images[0] ? "summary_large_image" : "summary", title, description },
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
  // Lug'atdagi izoh bo'lsa — atama ustiga borilganda qisqa izoh, bosilganda lug'at sahifasi
  const termLink = (key: string, text: string) => {
    const tr = it.terms?.[key];
    if (!tr) return text;
    return <Link href={`/${lang}/lugat#${key}`} className="term" title={pick(tr, "definition", lang)}>{text} ⓘ</Link>;
  };
  const permalink = `${SITE}/${lang}/bitiklar/${it.slug}`;
  const year = new Date(it.published_at || it.updated_at || Date.now()).getFullYear();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: pick(it, "title", lang),
    url: permalink,
    inLanguage: lang,
    artform: "Inscription",
    artMedium: label(d, "technique", it.technique),
    text: it.original_text,
    description: pick(it, "translation", lang) || undefined,
    dateCreated: it.year_from ? String(it.year_from) : it.period_text || undefined,
    creator: it.calligrapher ? { "@type": "Person", name: it.calligrapher } : undefined,
    image: it.images.map((im) => im.url),
    locationCreated: {
      "@type": "LandmarksOrHistoricalBuildings",
      name: pick(it.monument, "name", lang),
      url: `${SITE}/${lang}/obidalar/${it.monument.slug}`,
      address: { "@type": "PostalAddress", addressLocality: it.monument.city, addressCountry: "UZ" },
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
    },
    isPartOf: { "@type": "Dataset", name: "BITIKLAR", url: SITE },
    license: "https://creativecommons.org/licenses/by/4.0/",
    dateModified: it.updated_at,
  };

  return (
    <>
      <JsonLd data={jsonLd} />
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
          <div className="tags" style={{ marginTop: 14 }}>
            <span className={`tag tag-lang lang-${it.language}`}>{label(d, "language", it.language)}</span>
            {it.script !== "other" && <span className="tag">{label(d, "script", it.script)}</span>}
            {it.technique !== "other" && <span className="tag">{label(d, "technique", it.technique)}</span>}
          </div>
          <div className="head-tools">
            <ReaderTools item={{
              slug: it.slug, title_uz: it.title_uz, title_ru: it.title_ru, title_en: it.title_en,
              monument_uz: it.monument.name_uz, monument_ru: it.monument.name_ru, monument_en: it.monument.name_en,
              image: it.images[0]?.thumb_url || it.images[0]?.url || null,
            }} />
            <ShareBar
              title={pick(it, "title", lang)}
              text={it.original_text}
              labels={{ share: d.ui.share, linkCopied: d.ui.linkCopied, copyText: d.ui.copyText, copied: d.ui.copied }}
            />
          </div>
        </div>
      </section>

      <div className="container detail">
        <div>
          <div className="block">
            <Gallery
              images={it.images}
              fallbackText={it.original_text.slice(0, 80)}
              labels={{ noImage: t.noImage, show: d.ann.show, hide: d.ann.hide }}
            />
          </div>

          {it.audio_url && (
            <div className="block card card-body audio-box">
              <div className="kicker">🔊 {d.audio.title}</div>
              <audio controls preload="none" src={it.audio_url} style={{ width: "100%" }} />
              {it.audio_caption && <div className="muted" style={{ fontSize: ".85rem" }}>{it.audio_caption}</div>}
            </div>
          )}

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
            <div className="block-head">
              <h2>{t.translations}</h2>
              <ReadAloud text={pick(it, "translation", lang)} lang={lang} labels={d.speech} />
            </div>
            {order.map((l) => {
              const text = (it as any)[`translation_${l}`] as string;
              return text ? (
                <div key={l} className={`tr-block ${l === lang ? "current" : ""}`} lang={l}>
                  <small>{names[l]}</small>
                  {text}
                </div>
              ) : null;
            })}
            <MoreLanguages slug={it.slug} />
          </div>

          <AiGuide slug={it.slug} />

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
              <div><dt>{t.script}</dt><dd>{termLink(it.script, label(d, "script", it.script))}</dd></div>
              <div><dt>{t.technique}</dt><dd>{termLink(it.technique, label(d, "technique", it.technique))}</dd></div>
              <div><dt>{t.period}</dt><dd>{it.period_text || (it.year_from ? `${it.year_from}${it.year_to ? `–${it.year_to}` : ""}` : t.unknown)}</dd></div>
              {it.dynasty && <div><dt>{d.timeline.dynasty}</dt><dd><Link href={`/${lang}/davrlar#d-${it.dynasty}`}>{label(d, "dynasty", it.dynasty)}</Link></dd></div>}
              {it.hijri_date && <div><dt>{t.hijri}</dt><dd>{it.hijri_date}</dd></div>}
              <div><dt>{t.calligrapher}</dt><dd>{it.calligrapher || t.unknown}</dd></div>
              {!!it.persons?.length && (
                <div><dt>{d.persons.title}</dt><dd>
                  {it.persons.map((p, k) => (
                    <span key={p.slug}>{k > 0 && ", "}<Link href={`/${lang}/shaxslar/${p.slug}`}>{pick(p, "name", lang)}</Link>
                      <small className="muted"> ({label(d, "role", p.role)})</small></span>
                  ))}
                </dd></div>
              )}
              {!!it.quran?.length && (
                <div><dt>{d.quran.short}</dt><dd>
                  {it.quran.map((q, k) => (
                    <span key={k}>{k > 0 && "; "}<Link href={`/${lang}/oyatlar#sura-${q.surah}`}>{q.label}</Link></span>
                  ))}
                </dd></div>
              )}
              <div><dt>{t.gps}</dt><dd>{lat.toFixed(5)}, {lng.toFixed(5)}<br />
                <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`} target="_blank" rel="noopener noreferrer">{t.openMap} ↗</a></dd></div>
            </dl>
          </div>

          <div className="block">
            <MapLoader className="map-mini" points={[{ lat, lng, title: pick(it.monument, "name", lang) }]} />
            <div className="map-actions">
              <Link href={`/${lang}/xarita?bitik=${it.slug}`} className="btn btn-outline btn-sm">📍 {d.live.title}</Link>
            </div>
          </div>
          <div className="block">
            <LocationCard lat={lat} lng={lng} name={pick(it.monument, "name", lang)} address={it.monument.address || it.monument.city} />
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

          <CitationBox
            d={d}
            lang={lang}
            title={pick(it, "title", lang)}
            monument={pick(it.monument, "name", lang)}
            url={permalink}
            year={year}
            updated={it.updated_at}
          />

          <div className="card card-body block">
            <h3>{d.exportData.title}</h3>
            <a className="btn btn-outline btn-sm" href={`${PUBLIC_API}/api/inscriptions/${it.slug}/tei/`} download={`bitiklar-${it.slug}.xml`}>
              ⬇ {d.exportData.teiOne}
            </a>
          </div>

          <div className="aside-actions">
            <CompareButton slug={it.slug} />
            <PhotoSubmit inscription={it.slug} />
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
