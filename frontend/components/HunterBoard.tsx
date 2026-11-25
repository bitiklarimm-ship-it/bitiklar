"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { badges, getVisits, onVisitsChange, type Visit } from "@/lib/hunter";
import { pick } from "@/lib/i18n";
import { useDict, useLang } from "@/lib/useDict";

export default function HunterBoard({ total, cityTotals }: { total: number; cityTotals: Record<string, number> }) {
  const d = useDict();
  const lang = useLang();
  const h = d.hunter;
  const [visits, setVisits] = useState<Record<string, Visit> | null>(null);

  useEffect(() => {
    const load = () => setVisits(getVisits());
    load();
    return onVisitsChange(load);
  }, []);
  if (!visits) return <p className="muted">{d.ui.loading}</p>;

  const list = Object.values(visits).sort((a, b) => b.at - a.at);
  const bs = badges(visits, total, cityTotals);
  const name = (k: string) => k.startsWith("city:") ? `${h.badgeCity} ${k.slice(5)}` : (h.badges as Record<string, string>)[k] || k;

  return (
    <>
      <div className="hunter-top card card-body">
        <div className="hunter-count"><b>{list.length}</b><span>/ {total}</span></div>
        <div style={{ flex: 1 }}>
          <div className="quiz-progress" style={{ height: 10, borderRadius: 999 }}>
            <span style={{ width: `${total ? (list.length / total) * 100 : 0}%` }} />
          </div>
          <p className="muted" style={{ margin: "8px 0 0" }}>{h.howTo}</p>
        </div>
        <Link className="btn btn-dark" href={`/${lang}/xarita?joy=1`}>📍 {h.findNear}</Link>
      </div>

      <h2 style={{ marginTop: 32 }}>{h.badgesTitle}</h2>
      <div className="badges">
        {bs.map((b) => (
          <div key={b.key} className={`badge-card ${b.done ? "done" : ""}`}>
            <span className="badge-icon" aria-hidden="true">{b.icon}</span>
            <b>{name(b.key)}</b>
            <small>{Math.min(b.got, b.need)} / {b.need}</small>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 32 }}>{h.visitedList} ({list.length})</h2>
      {!list.length && <p className="muted">{h.none}</p>}
      <ul className="visit-list">
        {list.map((v) => (
          <li key={v.slug}>
            <Link href={`/${lang}/obidalar/${v.slug}`}>🏅 {pick(v, "name", lang)}</Link>
            <small className="muted"> · {v.city} · {new Date(v.at).toLocaleDateString()}</small>
          </li>
        ))}
      </ul>
    </>
  );
}
