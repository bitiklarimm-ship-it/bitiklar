"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { Inscription } from "@/lib/api";
import { api } from "@/lib/client";
import { getCompare } from "@/lib/compare";
import { label, pick } from "@/lib/i18n";
import { useDict, useLang } from "@/lib/useDict";

/** Ikki bitikni yonma-yon taqqoslash. */
export default function CompareView() {
  const d = useDict();
  const lang = useLang();
  const sp = useSearchParams();
  const [items, setItems] = useState<(Inscription | null)[] | null>(null);

  useEffect(() => {
    const a = sp.get("a"), b = sp.get("b");
    const slugs = a && b ? [a, b] : getCompare();
    if (slugs.length < 2) { setItems([]); return; }
    Promise.all(slugs.map(async (s) => {
      const r = await api(`/inscriptions/${s}/`);
      return r.ok ? ((await r.json()) as Inscription) : null;
    })).then(setItems);
  }, [sp]);

  if (items === null) return <p className="muted">{d.ui.loading}</p>;
  const [x, y] = items;
  if (!x || !y) return <div className="card card-body"><p>{d.compare.empty}</p><Link href={`/${lang}/bitiklar`} className="btn btn-dark">{d.hero.cta}</Link></div>;

  const t = d.inscription;
  const rows: [string, (i: Inscription) => React.ReactNode][] = [
    [t.monument, (i) => <Link href={`/${lang}/obidalar/${i.monument.slug}`}>{pick(i.monument, "name", lang)}</Link>],
    [d.monument.city, (i) => i.monument.city],
    [t.period, (i) => i.period_text || (i.year_from ? `${i.year_from}${i.year_to ? `–${i.year_to}` : ""}` : t.unknown)],
    [d.timeline.dynasty, (i) => label(d, "dynasty", i.dynasty || "unknown")],
    [t.language, (i) => label(d, "language", i.language)],
    [t.script, (i) => label(d, "script", i.script)],
    [t.technique, (i) => label(d, "technique", i.technique)],
    [t.placement, (i) => pick(i, "placement", lang) || "—"],
    [t.calligrapher, (i) => i.calligrapher || t.unknown],
  ];
  const same = (f: (i: Inscription) => React.ReactNode) => String(f(x)) === String(f(y));

  return (
    <div className="compare">
      <div className="compare-grid">
        {[x, y].map((i) => (
          <div key={i.slug} className="card">
            <div className="ins-thumb">
              {i.images[0]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={i.images[0].thumb_url || i.images[0].url} alt="" />
                : <div className="arabic">{i.original_text.slice(0, 60)}</div>}
            </div>
            <div className="card-body">
              <h3><Link href={`/${lang}/bitiklar/${i.slug}`}>{pick(i, "title", lang)}</Link></h3>
              <div className="original" style={{ fontSize: "1.5rem", padding: 16 }}>{i.original_text}</div>
              <div className="tr-block current" style={{ marginTop: 12 }}>{pick(i, "translation", lang) || "—"}</div>
            </div>
          </div>
        ))}
      </div>
      <table className="compare-table">
        <tbody>
          {rows.map(([name, f]) => (
            <tr key={name} className={same(f) ? "same" : ""}>
              <th>{name}</th><td>{f(x)}</td><td>{f(y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted" style={{ fontSize: ".85rem" }}>{d.compare.legend}</p>
    </div>
  );
}
