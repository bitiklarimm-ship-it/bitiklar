import type { Metadata } from "next";
import Link from "next/link";
import InscriptionCard from "@/components/InscriptionCard";
import { apiGet, qs, type InscriptionListItem, type Paginated, type Region } from "@/lib/api";
import { getDict, pick, type Locale } from "@/lib/i18n";

type SP = Record<string, string | undefined>;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).catalog.title };
}

export default async function Catalog({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<SP> }) {
  const lang = (await params).lang as Locale;
  const sp = await searchParams;
  const d = getDict(lang);
  const page = Number(sp.page || 1);
  const filters = {
    q: sp.q, language: sp.language, script: sp.script, technique: sp.technique, region: sp.region,
    monument: sp.monument, year_min: sp.year_min, year_max: sp.year_max,
  };
  const [data, regions] = await Promise.all([
    apiGet<Paginated<InscriptionListItem>>(`/inscriptions/${qs({ ...filters, page })}`, 30),
    apiGet<Region[]>("/regions/", 3600),
  ]);

  const opt = (group: "language" | "script" | "technique") =>
    Object.entries(d.labels[group]).map(([v, l]) => <option key={v} value={v}>{l}</option>);

  const pageLink = (p: number) => `/${lang}/bitiklar${qs({ ...filters, page: p })}`;

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.nav.catalog}</div>
          <h1>{d.catalog.title}</h1>
          <p>{d.catalog.subtitle}</p>
        </div>
      </section>
      <div className="container">
        <form className="card filters" action={`/${lang}/bitiklar`}>
          <input className="input" name="q" defaultValue={sp.q} placeholder={d.hero.searchPlaceholder} />
          <select className="input" name="language" defaultValue={sp.language || ""}>
            <option value="">{d.catalog.language}: {d.catalog.all}</option>{opt("language")}
          </select>
          <select className="input" name="script" defaultValue={sp.script || ""}>
            <option value="">{d.catalog.script}: {d.catalog.all}</option>{opt("script")}
          </select>
          <select className="input" name="technique" defaultValue={sp.technique || ""}>
            <option value="">{d.catalog.technique}: {d.catalog.all}</option>{opt("technique")}
          </select>
          <select className="input" name="region" defaultValue={sp.region || ""}>
            <option value="">{d.catalog.region}: {d.catalog.all}</option>
            {(regions || []).map((r) => <option key={r.slug} value={r.slug}>{pick(r, "name", lang)}</option>)}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-dark" type="submit">{d.catalog.filter}</button>
            <Link className="btn btn-outline" href={`/${lang}/bitiklar`}>{d.catalog.reset}</Link>
          </div>
        </form>

        <p className="muted">{data?.count ?? 0} {d.catalog.found}</p>
        {data?.results.length ? (
          <div className="grid grid-4">
            {data.results.map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
          </div>
        ) : (
          <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>{d.catalog.empty}</div>
        )}

        <div className="pager" style={{ marginBottom: 64 }}>
          {data?.previous && <Link className="btn btn-outline" href={pageLink(page - 1)}>← {d.catalog.prev}</Link>}
          {(data?.previous || data?.next) && <span className="muted">{page}</span>}
          {data?.next && <Link className="btn btn-outline" href={pageLink(page + 1)}>{d.catalog.next} →</Link>}
        </div>
      </div>
    </>
  );
}
