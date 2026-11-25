import type { Metadata } from "next";
import Link from "next/link";
import BriefRow from "@/components/BriefRow";
import { apiGet, type QuranIndex } from "@/lib/api";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.quran.title, description: d.quran.subtitle, alternates: { canonical: `/${lang}/oyatlar` } };
}

export default async function QuranPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  const data = await apiGet<QuranIndex>("/quran/", 300);
  const surahs = data?.surahs || [];
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.quran.title}</div>
          <h1>{d.quran.title}</h1>
          <p>{d.quran.subtitle}</p>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 1000 }}>
        {!surahs.length && <p className="muted">{d.quran.empty}</p>}
        {!!surahs.length && (
          <p className="muted">{surahs.length} {d.quran.surahs} · {data?.total} {d.quran.places}</p>
        )}
        {surahs.map((s) => (
          <section key={s.surah} id={`sura-${s.surah}`} className="card surah block">
            <header className="surah-head">
              <span className="surah-num">{s.surah}</span>
              <div>
                <h3 style={{ margin: 0 }}>{s.name}</h3>
                <small className="muted">{s.ayahs} {d.quran.ayahs}</small>
              </div>
              <span className="surah-ar arabic">{s.name_ar}</span>
            </header>
            <div className="brief-list">
              {s.items.map((it, k) => <BriefRow key={`${it.slug}-${k}`} it={it} lang={lang} d={d} extra={it.ref} />)}
            </div>
          </section>
        ))}
        <p className="ai-note">{d.quran.note}</p>
      </div>
    </>
  );
}
