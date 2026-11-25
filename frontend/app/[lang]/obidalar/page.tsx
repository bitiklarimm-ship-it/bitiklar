import type { Metadata } from "next";
import Link from "next/link";
import { apiGet, qs, type Monument, type Paginated, type Region } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).monument.title };
}

export default async function Monuments({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const lang = (await params).lang as Locale;
  const sp = await searchParams;
  const d = getDict(lang);
  const [data, regions] = await Promise.all([
    apiGet<Paginated<Monument>>(`/monuments/${qs({ q: sp.q, region: sp.region, kind: sp.kind, page: sp.page, page_size: 60 })}`),
    apiGet<Region[]>("/regions/", 3600),
  ]);

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.nav.monuments}</div>
          <h1>{d.monument.title}</h1>
          <p>{d.monument.subtitle}</p>
        </div>
      </section>
      <div className="container" style={{ paddingBottom: 64 }}>
        <form className="card filters filters-sm" action={`/${lang}/obidalar`}>
          <input className="input" name="q" defaultValue={sp.q} placeholder={d.catalog.search} />
          <select className="input" name="region" defaultValue={sp.region || ""}>
            <option value="">{d.catalog.region}: {d.catalog.all}</option>
            {(regions || []).map((r) => <option key={r.slug} value={r.slug}>{pick(r, "name", lang)}</option>)}
          </select>
          <select className="input" name="kind" defaultValue={sp.kind || ""}>
            <option value="">{d.catalog.all}</option>
            {Object.entries(d.labels.kind).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button className="btn btn-dark" type="submit">{d.catalog.filter}</button>
        </form>
        <div className="grid grid-3">
          {(data?.results || []).map((m) => (
            <Link key={m.id} href={`/${lang}/obidalar/${m.slug}`} className="card ins-card">
              <div className="ins-thumb girih">
                {m.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={m.cover_thumb_url || m.cover_url} alt={pick(m, "name", lang)} loading="lazy" />
                  : <div className="arabic" style={{ fontSize: "2.4rem" }}>۞</div>}
              </div>
              <div className="card-body">
                <h3>{pick(m, "name", lang)}</h3>
                <div className="ins-meta">{m.city} · {pick(m.region, "name", lang)}</div>
                <div className="tags">
                  <span className="tag">{label(d, "kind", m.kind)}</span>
                  {m.period && <span className="tag gold">{m.period}</span>}
                  <span className="tag">{m.inscriptions_count} {d.monument.inscriptions}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {!data?.results.length && <div className="card card-body" style={{ textAlign: "center", padding: 48 }}>{d.catalog.empty}</div>}
      </div>
    </>
  );
}
