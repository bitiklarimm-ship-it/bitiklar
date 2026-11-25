import type { Metadata } from "next";
import { PUBLIC_API } from "@/lib/api";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).about.title };
}

export default async function About({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <h1>{d.about.title}</h1>
          <p>{d.footer.tagline}</p>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 820 }}>
        <p style={{ fontSize: "1.15rem" }}>{d.about.p1}</p>
        <p>{d.about.p2}</p>
        <p>{d.about.p3}</p>
        <div className="card card-body" style={{ marginTop: 28 }}>
          <h2>{d.exportData.title}</h2>
          <p>{d.exportData.text}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a className="btn btn-outline" href={`${PUBLIC_API}/api/export/csv/`}>⬇ {d.exportData.csv}</a>
            <a className="btn btn-outline" href={`${PUBLIC_API}/api/export/json/`}>⬇ {d.exportData.json}</a>
            <a className="btn btn-outline" href={`${PUBLIC_API}/api/export/tei/`}>⬇ {d.exportData.tei}</a>
          </div>
        </div>
      </div>
    </>
  );
}
