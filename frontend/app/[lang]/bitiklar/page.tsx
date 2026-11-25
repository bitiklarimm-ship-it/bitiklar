import type { Metadata } from "next";
import Link from "next/link";
import InscriptionCard from "@/components/InscriptionCard";
import { apiGet, PUBLIC_API, qs, type InscriptionListItem, type Paginated, type Region } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

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
    monument: sp.monument, year_min: sp.year_min, year_max: sp.year_max, kind: sp.kind, ordering: sp.ordering,
  };
  const [data, regions] = await Promise.all([
    apiGet<Paginated<InscriptionListItem>>(`/inscriptions/${qs({ ...filters, page })}`, 30),
    apiGet<Region[]>("/regions/", 3600),
  ]);

  const opt = (group: "language" | "script" | "technique") =>
    Object.entries(d.labels[group]).map(([v, l]) => <option key={v} value={v}>{l}</option>);

  const pageLink = (p: number) => `/${lang}/bitiklar${qs({ ...filters, page: p })}`;
  const without = (k: keyof typeof filters) => `/${lang}/bitiklar${qs({ ...filters, [k]: undefined })}`;
  const regionName = (slug?: string) => pick((regions || []).find((r) => r.slug === slug), "name", lang) || slug;
  const active: { k: keyof typeof filters; text: string }[] = [
    sp.q ? { k: "q", text: `«${sp.q}»` } : null,
    sp.language ? { k: "language", text: label(d, "language", sp.language) } : null,
    sp.script ? { k: "script", text: label(d, "script", sp.script) } : null,
    sp.technique ? { k: "technique", text: label(d, "technique", sp.technique) } : null,
    sp.kind ? { k: "kind", text: label(d, "kind", sp.kind) } : null,
    sp.region ? { k: "region", text: regionName(sp.region) || "" } : null,
    sp.monument ? { k: "monument", text: sp.monument } : null,
  ].filter(Boolean) as { k: keyof typeof filters; text: string }[];
  const { ordering: _o, ...exportFilters } = filters;

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
          <select className="input" name="ordering" defaultValue={sp.ordering || ""} aria-label={d.ui.sort}>
            <option value="">{d.ui.sort}: {d.ui.sortNew}</option>
            <option value="-views_count">{d.ui.sortPopular}</option>
            <option value="year_from">{d.ui.sortOld}</option>
            <option value="title_uz">{d.ui.sortTitle}</option>
          </select>
          {sp.kind && <input type="hidden" name="kind" value={sp.kind} />}
          {sp.monument && <input type="hidden" name="monument" value={sp.monument} />}
          <div className="filters-actions">
            <button className="btn btn-dark" type="submit">{d.catalog.filter}</button>
            <Link className="btn btn-outline" href={`/${lang}/bitiklar`}>{d.catalog.reset}</Link>
          </div>
        </form>

        {!!active.length && (
          <div className="chips active-chips">
            <span className="muted">{d.ui.activeFilters}:</span>
            {active.map((a) => (
              <Link key={a.k} href={without(a.k)} className="chip chip-on" aria-label={`${a.text} ×`}>
                {a.text} <span aria-hidden="true">×</span>
              </Link>
            ))}
          </div>
        )}

        <div className="catalog-bar">
          <p className="muted" style={{ margin: 0 }}>{data?.count ?? 0} {d.catalog.found}</p>
          <div className="export-links" title={d.exportData.text}>
            <span className="muted">⬇ {d.exportData.title}:</span>
            <a href={`${PUBLIC_API}/api/export/csv/${qs(exportFilters)}`}>{d.exportData.csv}</a>
            <a href={`${PUBLIC_API}/api/export/json/${qs(exportFilters)}`}>{d.exportData.json}</a>
            <a href={`${PUBLIC_API}/api/export/tei/${qs(exportFilters)}`}>{d.exportData.tei}</a>
          </div>
        </div>
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
