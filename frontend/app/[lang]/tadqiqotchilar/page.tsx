import type { Metadata } from "next";
import ResearchPortal from "@/components/ResearchPortal";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).research.title, robots: { index: false } };
}

export default async function ResearchPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<{ bitik?: string; tab?: string }> }) {
  const lang = (await params).lang as Locale;
  const { bitik, tab } = await searchParams;
  const d = getDict(lang);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <h1>{d.research.title}</h1>
          <p>{d.research.subtitle}</p>
        </div>
      </section>
      <div className="container" style={{ padding: "36px 20px 64px" }}>
        <ResearchPortal lang={lang} d={d} initialSlug={bitik || ""} initialTab={tab} />
      </div>
    </>
  );
}
