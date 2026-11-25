import type { Metadata } from "next";
import Link from "next/link";
import { apiGet, type Route } from "@/lib/api";
import { getDict, pick, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.routes.title, description: d.routes.subtitle, alternates: { canonical: `/${lang}/yonalishlar` } };
}

export default async function RoutesPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const routes = (await apiGet<Route[]>("/routes/", 300)) || [];

  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.routes.title}</div>
          <h1>{d.routes.title}</h1>
          <p>{d.routes.subtitle}</p>
        </div>
      </section>
      <div className="container section">
        {!routes.length && <p className="muted">{d.routes.empty}</p>}
        <div className="grid grid-3">
          {routes.map((r) => (
            <Link key={r.slug} href={`/${lang}/yonalishlar/${r.slug}`} className="card ins-card">
              <div className="ins-thumb girih">
                {r.cover_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={r.cover_url} alt={pick(r, "title", lang)} loading="lazy" />
                  : <div className="route-glyph">⟡</div>}
              </div>
              <div className="card-body">
                <h3>{pick(r, "title", lang)}</h3>
                <div className="ins-meta">{r.region ? pick(r.region, "name", lang) : ""}</div>
                <div className="tags">
                  <span className="tag">{r.stops_count} {d.routes.stops}</span>
                  {r.duration && <span className="tag gold">{r.duration}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
