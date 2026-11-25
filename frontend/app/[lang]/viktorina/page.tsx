import type { Metadata } from "next";
import Link from "next/link";
import Quiz from "@/components/Quiz";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return { title: d.quiz.title, description: d.quiz.subtitle, alternates: { canonical: `/${lang}/viktorina` } };
}

export default async function QuizPage({ params }: { params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Locale;
  const d = getDict(lang);
  return (
    <>
      <section className="page-head girih">
        <div className="container">
          <div className="breadcrumbs"><Link href={`/${lang}`}>BITIKLAR</Link> / {d.quiz.title}</div>
          <h1>🎯 {d.quiz.title}</h1>
          <p>{d.quiz.subtitle}</p>
        </div>
      </section>
      <div className="container section" style={{ maxWidth: 760 }}>
        <Quiz />
      </div>
    </>
  );
}
