import type { Metadata } from "next";
import Link from "next/link";
import { apiGet, type Term } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.glossary.title, description: d.glossary.subtitle, alternates: { canonical: `/${lang}/lugat` } };
}

export default async function GlossaryPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const terms = (await apiGet<Term[]>("/glossary/", 600)) || [];
  const groups = ["script", "technique", "architecture", "text", "other"].filter((g) => terms.some((t) => t.group === g));
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.glossary.title}</div>
          <h1>{d.glossary.title}</h1>
          <p>{d.glossary.subtitle}</p>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 1000 }}>
        <nav className="chips" style={{ marginBottom: 28 }}>
          {groups.map((g) => <a key={g} href={`#g-${g}`} className="chip">{label(d, "termGroup", g)}</a>)}
        </nav>
        {groups.map((g) => (
          <section key={g} id={`g-${g}`} className="block">
            <h2>{label(d, "termGroup", g)}</h2>
            <dl className="glossary">
              {terms.filter((t) => t.group === g).map((t) => (
                <div key={t.key} id={t.key} className="card card-body gl-item">
                  <dt>
                    <b>{pick(t, "term", lang)}</b>
                    {t.term_original && <span className="arabic gl-orig">{t.term_original}</span>}
                  </dt>
                  <dd>{pick(t, "definition", lang)}</dd>
                  {(g === "script" || g === "technique") && (
                    <Link className="link-arrow" href={`/${lang}/bitiklar?${g}=${t.key}`}>{d.glossary.examples} →</Link>
                  )}
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </>
  );
}
