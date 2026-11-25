import Link from "next/link";
import InscriptionCard from "@/components/InscriptionCard";
import { apiGet, type InscriptionListItem, type Paginated, type Route, type Stats } from "@/lib/api";
import { getDict, pick, type Locale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const h = d.homeX;
  const [stats, featured, latest, routes] = await Promise.all([
    apiGet<Stats>("/stats/", 300),
    apiGet<Paginated<InscriptionListItem>>("/inscriptions/?is_featured=true&page_size=4"),
    apiGet<Paginated<InscriptionListItem>>("/inscriptions/?ordering=-published_at&page_size=8"),
    apiGet<Route[]>("/routes/", 300),
  ]);
  const by = stats?.by_language || {};

  const sections = [
    { key: "arabic", glyph: "ع", title: d.sections.arabic, desc: d.sections.arabicDesc },
    { key: "persian", glyph: "پ", title: d.sections.persian, desc: d.sections.persianDesc },
    { key: "turkic", glyph: "ڭ", title: d.sections.turkic, desc: d.sections.turkicDesc },
    { key: "other", glyph: "◈", title: d.sections.other, desc: d.sections.otherDesc },
  ];
  const quick = [
    { p: "script=square_kufic", l: d.labels.script.square_kufic },
    { p: "script=thuluth", l: d.labels.script.thuluth },
    { p: "technique=majolica", l: d.labels.technique.majolica },
    { p: "kind=mausoleum", l: d.labels.kind.mausoleum },
    { p: "kind=minaret", l: d.labels.kind.minaret },
  ];

  return (
    <>
      <section className="hero">
        <div className="hero-bg girih" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-text">
            <div className="hero-arabic">بسم الله الرحمن الرحيم</div>
            <span className="eyebrow">{d.hero.kicker}</span>
            <h1>{d.hero.title}</h1>
            <p className="lead">{d.hero.subtitle}</p>
            <form className="hero-search" action={`/${lang}/bitiklar`} role="search">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <input name="q" placeholder={d.hero.searchPlaceholder} aria-label={d.catalog.search} />
              <button className="btn btn-primary" type="submit">{d.catalog.search}</button>
            </form>
            <div className="chips" aria-label={h.quick}>
              {quick.map((c) => (
                <Link key={c.p} href={`/${lang}/bitiklar?${c.p}`} className="chip chip-light">{c.l}</Link>
              ))}
            </div>
          </div>

          <div className="hero-card">
            <Link href={`/${lang}/xarita?joy=1`} className="near-cta">
              <span className="near-cta-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>
              </span>
              <span>
                <b>{h.nearMe}</b>
                <small>{h.nearMeText}</small>
              </span>
              <span className="near-cta-go" aria-hidden="true">→</span>
            </Link>
            <Link href={`/${lang}/aniqlash`} className="near-cta near-cta-alt">
              <span className="near-cta-icon" aria-hidden="true">📷</span>
              <span>
                <b>{d.identify.title}</b>
                <small>{d.identify.short}</small>
              </span>
              <span className="near-cta-go" aria-hidden="true">→</span>
            </Link>
            {stats && (
              <div className="stats">
                <div className="stat"><b>{stats.inscriptions}</b><span>{d.home.stats.inscriptions}</span></div>
                <div className="stat"><b>{stats.monuments}</b><span>{d.home.stats.monuments}</span></div>
                <div className="stat"><b>{stats.regions}</b><span>{d.home.stats.regions}</span></div>
              </div>
            )}
            <div className="hero-actions">
              <Link href={`/${lang}/bitiklar`} className="btn btn-primary">{d.hero.cta} →</Link>
              <Link href={`/${lang}/xarita`} className="btn btn-ghost">{d.hero.map}</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>{d.sections.title}</h2></div>
          <div className="grid grid-4">
            {sections.map((s) => (
              <Link key={s.key} href={`/${lang}/bitiklar?language=${s.key}`} className={`card section-card lang-${s.key}`}>
                <span className="count">{by[s.key] ?? 0}</span>
                <div className="glyph">{s.glyph}</div>
                <h3>{s.title}</h3>
                <p className="muted" style={{ margin: 0, fontSize: ".92rem" }}>{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {!!featured?.results.length && (
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <h2>{d.home.featured}</h2>
              <Link href={`/${lang}/bitiklar`} className="link-arrow">{d.home.seeAll} →</Link>
            </div>
            <div className="grid grid-4">
              {featured.results.slice(0, 4).map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section section-tight">
        <div className="container">
          <div className="section-head"><h2>{h.stepsTitle}</h2></div>
          <ol className="steps">
            {[[h.s1t, h.s1d, "🕌"], [h.s2t, h.s2d, "▦"], [h.s3t, h.s3d, "📖"]].map(([t, x, ic], i) => (
              <li key={i} className="card step">
                <span className="step-num">{i + 1}</span>
                <span className="step-icon" aria-hidden="true">{ic}</span>
                <h3>{t}</h3>
                <p className="muted">{x}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {!!routes?.length && (
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <div>
                <h2>{h.routesTitle}</h2>
                <p className="muted" style={{ margin: 0 }}>{h.routesText}</p>
              </div>
              <Link href={`/${lang}/yonalishlar`} className="link-arrow">{d.home.seeAll} →</Link>
            </div>
            <div className="grid grid-3">
              {routes.slice(0, 3).map((r) => (
                <Link key={r.slug} href={`/${lang}/yonalishlar/${r.slug}`} className="card route-card">
                  <span className="route-card-num">{r.stops_count}</span>
                  <div>
                    <h3>{pick(r, "title", lang)}</h3>
                    <div className="ins-meta">{r.region ? pick(r.region, "name", lang) : ""}{r.duration ? ` · ${r.duration}` : ""}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {!!latest?.results.length && (
        <section className="section section-tight">
          <div className="container">
            <div className="section-head">
              <h2>{d.home.latest}</h2>
              <Link href={`/${lang}/bitiklar`} className="link-arrow">{d.home.seeAll} →</Link>
            </div>
            <div className="grid grid-4">
              {latest.results.slice(0, 8).map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section section-tight">
        <div className="container">
          <div className="cta-band girih">
            <div>
              <h2>{d.home.researchTitle}</h2>
              <p>{d.home.researchText}</p>
            </div>
            <div className="cta-actions">
              <Link href={`/${lang}/tadqiqotchilar`} className="btn btn-primary">{d.nav.research} →</Link>
              <Link href={`/${lang}/haqida`} className="btn btn-ghost">{d.exportData.title}</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
