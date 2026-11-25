"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { label, type Locale } from "@/lib/i18n";
import { useDict, useLang } from "@/lib/useDict";

type Opt = { key?: string; uz?: string; ru?: string; en?: string };
type Q = { kind: "monument" | "language" | "city" | "script"; slug: string; text: string; image: string | null;
  title: Record<Locale, string>; options: Opt[]; answer: number };

/** Katalog ma'lumotidan tuzilgan viktorina (bepul, AI'siz). */
export default function Quiz() {
  const d = useDict();
  const lang = useLang();
  const t = d.quiz;
  const [qs, setQs] = useState<Q[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const load = useCallback(async () => {
    setQs(null); setI(0); setPicked(null); setScore(0);
    const r = await api("/quiz/");
    setQs(r.ok ? (await r.json()).questions : []);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (qs === null) return <p className="muted">{d.ui.loading}</p>;
  if (!qs.length) return <p className="muted">{t.empty}</p>;

  if (i >= qs.length) {
    const pct = Math.round((score / qs.length) * 100);
    return (
      <div className="card card-body quiz-end">
        <div className="quiz-score">{score} / {qs.length}</div>
        <p>{pct >= 80 ? t.great : pct >= 50 ? t.good : t.tryAgain}</p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <button className="btn btn-dark" onClick={load}>↻ {t.again}</button>
          <Link className="btn btn-outline" href={`/${lang}/bitiklar`}>{d.hero.cta}</Link>
        </div>
      </div>
    );
  }

  const q = qs[i];
  const optText = (o: Opt) => o.key ? label(d, q.kind === "language" ? "language" : "script", o.key) : (o[lang] || o.uz || "");
  const question = { monument: t.qMonument, language: t.qLanguage, city: t.qCity, script: t.qScript }[q.kind];

  return (
    <div className="card quiz">
      <div className="quiz-progress"><span style={{ width: `${(i / qs.length) * 100}%` }} /></div>
      <div className="card-body">
        <div className="muted" style={{ fontSize: ".85rem" }}>{t.question} {i + 1} / {qs.length} · {t.score}: {score}</div>
        <div className="quiz-media">
          {q.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={q.image} alt="" />
            : <div className="original" style={{ fontSize: "1.6rem", padding: 18 }}>{q.text}</div>}
        </div>
        <h3>{question}</h3>
        {q.kind !== "monument" && <p className="muted" style={{ marginTop: -6 }}>«{q.title[lang] || q.title.uz}»</p>}
        <div className="quiz-opts">
          {q.options.map((o, k) => {
            const state = picked === null ? "" : k === q.answer ? "right" : k === picked ? "wrong" : "dim";
            return (
              <button key={k} className={`quiz-opt ${state}`} disabled={picked !== null}
                onClick={() => { setPicked(k); if (k === q.answer) setScore((s) => s + 1); }}>
                {optText(o)}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div className="quiz-next">
            <span className={picked === q.answer ? "ok-text" : "err-text"}>{picked === q.answer ? `✓ ${t.right}` : `✕ ${t.wrong}`}</span>
            <Link href={`/${lang}/bitiklar/${q.slug}`} target="_blank" className="link-arrow">{t.learn} ↗</Link>
            <button className="btn btn-dark btn-sm" onClick={() => { setI(i + 1); setPicked(null); }}>{t.next} →</button>
          </div>
        )}
      </div>
    </div>
  );
}
