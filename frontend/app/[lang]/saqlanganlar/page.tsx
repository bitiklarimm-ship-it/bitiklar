import type { Metadata } from "next";
import Link from "next/link";
import SavedList from "@/components/SavedList";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).saved.title, robots: { index: false } };
}

export default async function SavedPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.saved.title}</div>
          <h1>{d.saved.title}</h1>
          <p>{d.saved.subtitle}</p>
        </div>
      </section>
      <div className="container section">
        <SavedList />
      </div>
    </>
  );
}
