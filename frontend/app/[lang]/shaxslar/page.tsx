import type { Metadata } from "next";
import Link from "next/link";
import { apiGet, type Person } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.persons.title, description: d.persons.subtitle, alternates: { canonical: `/${lang}/shaxslar` } };
}

export default async function PersonsPage({ params, searchParams }: {
  params: Promise<{ lang: string }>; searchParams: Promise<{ rol?: string }>;
}) {
  const lang = (await params).lang as Locale;
  const { rol } = await searchParams;
  const d = getDict(lang);
  const all = (await apiGet<Person[]>(`/persons/${rol ? `?role=${rol}` : ""}`, 300)) || [];
  const roles = Object.keys(d.labels.role);

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.persons.title}</div>
          <h1>{d.persons.title}</h1>
          <p>{d.persons.subtitle}</p>
        </div>
      </section>
      <div className="container section">
        <div className="chips" style={{ marginBottom: 24 }}>
          <Link href={`/${lang}/shaxslar`} className={`chip ${!rol ? "chip-on" : ""}`}>{d.catalog.all}</Link>
          {roles.map((r) => (
            <Link key={r} href={`/${lang}/shaxslar?rol=${r}`} className={`chip ${rol === r ? "chip-on" : ""}`}>{label(d, "role", r)}</Link>
          ))}
        </div>
        {!all.length && <p className="muted">{d.persons.empty}</p>}
        <div className="grid grid-3">
          {all.map((p) => (
            <Link key={p.slug} href={`/${lang}/shaxslar/${p.slug}`} className="card person-card">
              <span className="person-av">
                {p.portrait_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.portrait_url} alt="" loading="lazy" />
                  : <span className="arabic">{(p.name_original || pick(p, "name", lang)).slice(0, 2)}</span>}
              </span>
              <span>
                <b>{pick(p, "name", lang)}</b>
                <small className="muted">{label(d, "role", p.role)}{p.years ? ` · ${p.years}` : ""}</small>
                <span className="tag" style={{ marginTop: 6, display: "inline-block" }}>{p.inscriptions_count} {d.monument.inscriptions}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
