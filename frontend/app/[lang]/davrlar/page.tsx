import type { Metadata } from "next";
import Link from "next/link";
import BriefRow from "@/components/BriefRow";
import { apiGet, type Timeline } from "@/lib/api";
import { getDict, label, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.timeline.title, description: d.timeline.subtitle, alternates: { canonical: `/${lang}/davrlar` } };
}

export default async function TimelinePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const data = await apiGet<Timeline>("/timeline/", 300);
  const groups = data?.groups || [];
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.timeline.title}</div>
          <h1>{d.timeline.title}</h1>
          <p>{d.timeline.subtitle}</p>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 1000 }}>
        {groups.length > 1 && (
          <nav className="chips" style={{ marginBottom: 28 }}>
            {groups.map((g) => <a key={g.dynasty || "x"} href={`#d-${g.dynasty || "x"}`} className="chip">{label(d, "dynasty", g.dynasty || "unknown")} · {g.items.length}</a>)}
          </nav>
        )}
        {!groups.length && <p className="muted">{d.catalog.empty}</p>}
        <ol className="timeline">
          {groups.map((g) => (
            <li key={g.dynasty || "x"} id={`d-${g.dynasty || "x"}`} className="tl-group">
              <div className="tl-dot" aria-hidden="true" />
              <h2>{label(d, "dynasty", g.dynasty || "unknown")}</h2>
              <div className="brief-list">
                {g.items.map((it) => (
                  <BriefRow key={it.slug} it={it} lang={lang} d={d}
                    extra={it.year_from ? `${it.year_from}${it.year_to && it.year_to !== it.year_from ? `–${it.year_to}` : ""}` : undefined} />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
