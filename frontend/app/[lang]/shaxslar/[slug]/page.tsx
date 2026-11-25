import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import InscriptionCard from "@/components/InscriptionCard";
import JsonLd, { SITE } from "@/components/JsonLd";
import { apiGet, type Person } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

type P = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = await apiGet<Person>(`/persons/${slug}/`);
  if (!p) return {};
  const l = lang as Locale;
  return { title: pick(p, "name", l), description: pick(p, "bio", l).slice(0, 160), alternates: { canonical: `/${l}/shaxslar/${slug}` } };
}

export default async function PersonPage({ params }: P) {
  const { slug } = await params;
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const p = await apiGet<Person>(`/persons/${slug}/`, 120);
  if (!p) notFound();
  const bio = pick(p, "bio", lang);
  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Person", name: pick(p, "name", lang),
        alternateName: [p.name_original, p.name_uz, p.name_ru, p.name_en].filter(Boolean),
        description: bio || undefined, url: `${SITE}/${lang}/shaxslar/${p.slug}`,
      }} />
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / <Link href={`/${lang}/shaxslar`}>{d.persons.title}</Link></div>
          {p.name_original && <div className="hero-arabic" style={{ marginBottom: 4 }}>{p.name_original}</div>}
          <h1>{pick(p, "name", lang)}</h1>
          <p>{label(d, "role", p.role)}{p.years ? ` · ${p.years}` : ""}</p>
        </div>
      </section>
      <div className="container section">
        {bio && <div className="prose block" style={{ maxWidth: 820 }}>{bio}</div>}
        <h2>{d.persons.works} ({p.inscriptions?.length || 0})</h2>
        <div className="grid grid-4">
          {(p.inscriptions || []).map((it) => <InscriptionCard key={it.id} item={it} lang={lang} d={d} />)}
        </div>
      </div>
    </>
  );
}
