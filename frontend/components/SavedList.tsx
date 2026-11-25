"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pick } from "@/lib/i18n";
import { clearList, onSavedChange, readList, type SavedItem } from "@/lib/saved";
import { useDict, useLang } from "@/lib/useDict";

function Grid({ items, lang }: { items: SavedItem[]; lang: ReturnType<typeof useLang> }) {
  return (
    <div className="grid grid-4">
      {items.map((x) => (
        <Link key={x.slug} href={`/${lang}/bitiklar/${x.slug}`} className="card ins-card">
          <div className="ins-thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {x.image ? <img src={x.image} alt="" loading="lazy" /> : <div className="arabic">ب</div>}
          </div>
          <div className="card-body">
            <h3>{pick(x, "title", lang)}</h3>
            <div className="ins-meta">{pick(x, "monument", lang)}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function SavedList() {
  const d = useDict();
  const lang = useLang();
  const [saved, setSaved] = useState<SavedItem[] | null>(null);
  const [recent, setRecent] = useState<SavedItem[]>([]);

  useEffect(() => {
    const load = () => { setSaved(readList("saved")); setRecent(readList("recent")); };
    load();
    return onSavedChange(load);
  }, []);

  if (saved === null) return <p className="muted">{d.ui.loading}</p>;
  return (
    <>
      <div className="section-head">
        <h2>★ {d.saved.title} ({saved.length})</h2>
        {!!saved.length && <button className="btn btn-outline btn-sm" onClick={() => clearList("saved")}>{d.saved.clear}</button>}
      </div>
      {saved.length ? <Grid items={saved} lang={lang} /> : <p className="muted">{d.saved.empty}</p>}

      <div className="section-head" style={{ marginTop: 48 }}>
        <h2>🕘 {d.saved.recent}</h2>
        {!!recent.length && <button className="btn btn-outline btn-sm" onClick={() => clearList("recent")}>{d.saved.clear}</button>}
      </div>
      {recent.length ? <Grid items={recent} lang={lang} /> : <p className="muted">{d.saved.recentEmpty}</p>}
    </>
  );
}
