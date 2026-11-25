import type { Metadata } from "next";
import Link from "next/link";
import IdentifyPhoto from "@/components/IdentifyPhoto";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.identify.title, description: d.identify.subtitle, alternates: { canonical: `/${lang}/aniqlash` } };
}

export default async function IdentifyPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.identify.title}</div>
          <h1>📷 {d.identify.title}</h1>
          <p>{d.identify.subtitle}</p>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 980 }}>
        <IdentifyPhoto />
      </div>
    </>
  );
}
