import type { Metadata } from "next";
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
      </div>
    </>
  );
}
