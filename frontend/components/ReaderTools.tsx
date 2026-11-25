"use client";

import { useEffect, useState } from "react";
import { isSaved, onSavedChange, pushRecent, toggleSaved, type SavedItem } from "@/lib/saved";
import { useDict } from "@/lib/useDict";

const SCALES = [0.9, 1, 1.15, 1.3, 1.5];

/** Bitik sahifasi: saqlash, matn o'lchami; sahifa "yaqinda ko'rilganlar"ga yoziladi. */
export default function ReaderTools({ item }: { item: Omit<SavedItem, "at"> }) {
  const d = useDict();
  const [saved, setSaved] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    pushRecent(item);
    setSaved(isSaved(item.slug));
    const off = onSavedChange(() => setSaved(isSaved(item.slug)));
    try {
      const s = Number(localStorage.getItem("bitiklar_scale") || "1");
      if (SCALES.includes(s)) setScale(s);
    } catch { /* */ }
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.slug]);

  useEffect(() => {
    document.documentElement.style.setProperty("--read-scale", String(scale));
    try { localStorage.setItem("bitiklar_scale", String(scale)); } catch { /* */ }
  }, [scale]);

  const idx = SCALES.indexOf(scale);
  return (
    <div className="reader-tools">
      <button className={`btn btn-ghost btn-sm ${saved ? "is-saved" : ""}`} onClick={() => setSaved(toggleSaved(item))} aria-pressed={saved}>
        {saved ? "★" : "☆"} {saved ? d.saved.saved : d.saved.save}
      </button>
      <div className="size-ctl" role="group" aria-label={d.saved.textSize}>
        <button onClick={() => setScale(SCALES[Math.max(0, idx - 1)])} disabled={idx <= 0} aria-label={`${d.saved.textSize} −`}>A−</button>
        <button onClick={() => setScale(SCALES[Math.min(SCALES.length - 1, idx + 1)])} disabled={idx >= SCALES.length - 1} aria-label={`${d.saved.textSize} +`}>A+</button>
      </div>
    </div>
  );
}
