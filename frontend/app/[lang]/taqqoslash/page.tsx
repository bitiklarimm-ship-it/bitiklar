import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CompareView from "@/components/CompareView";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).compare.title, robots: { index: false } };
}

export default async function ComparePage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.compare.title}</div>
          <h1>⇄ {d.compare.title}</h1>
          <p>{d.compare.subtitle}</p>
        </div>
      </section>
      <div className="container section">
        <Suspense fallback={<p className="muted">{d.ui.loading}</p>}><CompareView /></Suspense>
      </div>
    </>
  );
}
