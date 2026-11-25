import type { Metadata } from "next";
import Link from "next/link";
import { exploreLinks } from "@/lib/explore";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).explore.title };
}

/** Barcha bo'limlar bir sahifada. */
export default async function ExplorePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const items = exploreLinks(lang, d);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <h1>{d.explore.title}</h1>
          <p>{d.explore.subtitle}</p>
        </div>
      </section>
      <div className="container section">
        <div className="grid grid-3">
          {items.map((x) => (
            <Link key={x.href} href={x.href} className="card explore-card">
              <span className="explore-icon" aria-hidden="true">{x.icon}</span>
              <span><b>{x.label}</b><small className="muted">{x.desc}</small></span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
