"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCompare, onCompareChange, toggleCompare } from "@/lib/compare";
import { useDict, useLang } from "@/lib/useDict";

export default function CompareButton({ slug }: { slug: string }) {
  const d = useDict();
  const lang = useLang();
  const [list, setList] = useState<string[]>([]);
  useEffect(() => {
    const load = () => setList(getCompare());
    load();
    return onCompareChange(load);
  }, []);
  const on = list.includes(slug);
  return (
    <div className="compare-btn">
      <button className={`btn btn-outline btn-sm ${on ? "is-on" : ""}`} onClick={() => setList(toggleCompare(slug))}>
        ⇄ {on ? d.compare.added : d.compare.add}
      </button>
      {list.length === 2 && on && (
        <Link className="btn btn-dark btn-sm" href={`/${lang}/taqqoslash?a=${list[0]}&b=${list[1]}`}>{d.compare.open} →</Link>
      )}
      {list.length === 1 && on && <small className="muted">{d.compare.pickOther}</small>}
    </div>
  );
}
