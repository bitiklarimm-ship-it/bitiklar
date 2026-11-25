import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RouteGuide from "@/components/RouteGuide";
import { apiGet, type Route } from "@/lib/api";
import { getDict, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDict(lang).guide.title, robots: { index: false } };
}

export default async function GuidePage({ params }: P) {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const r = await apiGet<Route>(`/routes/${slug}/`, 120);
  if (!r || !r.stops?.length) notFound();
  return (
    <>
      <section className="page-head girih" style={{ paddingBottom: 24 }}>
        <div className="container">
          <div className="breadcrumbs">
            <Link href={`/${lang}/yonalishlar/${slug}`}>← {pick(r, "title", lang)}</Link>
          </div>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>🧭 {d.guide.title}</h1>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 760, paddingTop: 24 }}>
        <RouteGuide stops={r.stops} routeSlug={slug} />
      </div>
    </>
  );
}
