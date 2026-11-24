import Link from "next/link";
import InscriptionCard from "@/components/InscriptionCard";
import { apiGet, type InscriptionListItem, type Paginated, type Stats } from "@/lib/api";
import { getDict, type Locale } from "@/lib/i18n";

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const [stats, featured, latest] = await Promise.all([
    apiGet<Stats>("/stats/", 300),
    apiGet<Paginated<InscriptionListItem>>("/inscriptions/?is_featured=true&page_size=4"),
    apiGet<Paginated<InscriptionListItem>>("/inscriptions/?ordering=-published_at"),
  ]);
  const by = stats?.by_language || {};

  const sections = [
    { key: "arabic", glyph: "ع", title: d.sections.arabic, desc: d.sections.arabicDesc },
    { key: "persian", glyph: "پ", title: d.sections.persian, desc: d.sections.persianDesc },
    { key: "turkic", glyph: "ڭ", title: d.sections.turkic, desc: d.sections.turkicDesc },
    { key: "other", glyph: "◈", title: d.sections.other, desc: d.sections.otherDesc },
  ];

  return (
    <>
      <section className="hero girih">
        <div className="container">
          <div className="hero-arabic">بسم الله الرحمن الرحيم</div>
          <div className="kicker">{d.hero.kicker}</div>
          <h1>{d.hero.title}</h1>
          <p className="lead">{d.hero.subtitle}</p>
          <form className="hero-search" action={`/${lang}/bitiklar`}>
            <input name="q" placeholder={d.hero.searchPlaceholder} aria-label={d.catalog.search} />
            <button className="btn btn-primary" type="submit">{d.catalog.search}</button>
          </form>
          <div className="hero-actions">
            <Link href={`/${lang}/bitiklar`} className="btn btn-primary">{d.hero.cta} →</Link>
            <Link href={`/${lang}/xarita`} className="btn btn-ghost">{d.hero.map}</Link>
          </div>
          {stats && (
            <div className="stats">
              <div className="stat"><b>{stats.inscriptions}</b><span>{d.home.stats.inscriptions}</span></div>
              <div className="stat"><b>{stats.monuments}</b><span>{d.home.stats.monuments}</span></div>
              <div className="stat"><b>{stats.regions}</b><span>{d.home.stats.regions}</span></div>
            </div>
          )}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head"><h2>{d.sections.title}</h2></div>
          <div className="grid grid-4">
            {sections.map((s) => (
              <Link key={s.key} href={`/${lang}/bitiklar?language=${s.key}`} className="card section-card">
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
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <h2>{d.home.featured}</h2>
              <Link href={`/${lang}/bitiklar`}>{d.home.seeAll} →</Link>
            </div>
            <div className="grid grid-4">
              {featured.results.slice(0, 4).map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="feature card">
            <div className="girih" style={{ color: "#fff" }}>
              <div className="kicker">OpenStreetMap</div>
              <h2 style={{ color: "#fff" }}>{d.home.mapTitle}</h2>
              <p style={{ color: "#d7dcea" }}>{d.home.mapText}</p>
              <Link href={`/${lang}/xarita`} className="btn btn-primary">{d.nav.map} →</Link>
            </div>
            <div>
              <h3>{d.home.qrTitle}</h3>
              <p className="muted">{d.home.qrText}</p>
              <h3 style={{ marginTop: 24 }}>{d.home.researchTitle}</h3>
              <p className="muted">{d.home.researchText}</p>
              <Link href={`/${lang}/tadqiqotchilar`} className="btn btn-outline">{d.nav.research} →</Link>
            </div>
          </div>
        </div>
      </section>

      {!!latest?.results.length && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="container">
            <div className="section-head">
              <h2>{d.home.latest}</h2>
              <Link href={`/${lang}/bitiklar`}>{d.home.seeAll} →</Link>
            </div>
            <div className="grid grid-4">
              {latest.results.slice(0, 8).map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
