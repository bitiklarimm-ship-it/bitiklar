"use client";

import { useMemo, useState } from "react";
import type { Dict } from "@/lib/i18n";

type Props = {
  d: Dict;
  title: string;        // bitik sarlavhasi (joriy tilda)
  monument: string;
  url: string;          // doimiy havola
  year: number;         // nashr/yangilangan yil
  updated: string;      // ISO sana
  lang: string;
};

const MONTHS_EN = ["Jan.", "Feb.", "Mar.", "Apr.", "May", "June", "July", "Aug.", "Sept.", "Oct.", "Nov.", "Dec."];

/** Ilmiy ishlarda keltirish uchun tayyor iqtibos: GOST, APA, Chicago, BibTeX. */
export default function CitationBox({ d, title, monument, url, year, updated, lang }: Props) {
  const [fmt, setFmt] = useState<"gost" | "apa" | "chicago" | "bibtex">("gost");
  const [copied, setCopied] = useState(false);
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const accessedRu = `${dd}.${mm}.${today.getFullYear()}`;
  const accessedEn = `${today.getDate()} ${MONTHS_EN[today.getMonth()]} ${today.getFullYear()}`;
  const accessedIso = today.toISOString().slice(0, 10);
  const slug = url.split("/").filter(Boolean).pop() || "bitik";

  const text = useMemo(() => {
    switch (fmt) {
      case "apa":
        return `BITIKLAR. (${year}). ${title} [${monument}]. BITIKLAR: O'zbekiston epigrafikasi raqamli katalogi. Retrieved ${accessedEn}, from ${url}`;
      case "chicago":
        return `BITIKLAR. "${title}." ${monument}. BITIKLAR: Digital Catalogue of Uzbekistan's Epigraphy, ${year}. Accessed ${accessedEn}. ${url}.`;
      case "bibtex":
        return `@misc{bitiklar_${slug.replace(/[^a-z0-9]/gi, "_")},
  author       = {{BITIKLAR}},
  title        = {${title} [${monument}]},
  year         = {${year}},
  howpublished = {\\url{${url}}},
  note         = {BITIKLAR: O'zbekiston epigrafikasi raqamli katalogi. Accessed: ${accessedIso}},
  urldate      = {${accessedIso}}
}`;
      default: // GOST R 7.0.100-2018
        return `${title} [${monument}] // BITIKLAR: O'zbekiston epigrafikasi raqamli katalogi. – ${year}. – URL: ${url} (${d.cite.accessed}: ${accessedRu}).`;
    }
  }, [fmt, title, monument, url, year, accessedEn, accessedRu, accessedIso, slug, d.cite.accessed]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard yopiq bo'lishi mumkin */
    }
  }

  return (
    <div className="card card-body block cite" lang={lang}>
      <h3>{d.cite.title}</h3>
      <div className="seg">
        {(["gost", "apa", "chicago", "bibtex"] as const).map((f) => (
          <button key={f} className={fmt === f ? "active" : ""} onClick={() => setFmt(f)}>{f === "gost" ? "ГОСТ" : f.toUpperCase()}</button>
        ))}
      </div>
      <pre className="cite-text">{text}</pre>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn btn-outline btn-sm" onClick={copy}>{copied ? `✓ ${d.cite.copied}` : d.cite.copy}</button>
        <span className="muted" style={{ fontSize: ".8rem" }} title={updated}>{d.cite.permalink}: <a href={url}>{url.replace(/^https?:\/\//, "")}</a></span>
      </div>
    </div>
  );
}
