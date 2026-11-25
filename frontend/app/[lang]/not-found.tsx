"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getDict, isLocale } from "@/lib/i18n";

export default function NotFound() {
  const seg = (usePathname() || "/uz").split("/")[1] || "uz";
  const lang = isLocale(seg) ? seg : "uz";
  const d = getDict(lang);
  return (
    <section className="container notfound">
      <div className="notfound-glyph arabic" aria-hidden="true">٤٠٤</div>
      <h1>{d.ui.notFoundTitle}</h1>
      <p className="muted">{d.ui.notFoundText}</p>
      <div className="hero-actions" style={{ justifyContent: "center" }}>
        <Link href={`/${lang}`} className="btn btn-dark">{d.ui.backHome}</Link>
        <Link href={`/${lang}/bitiklar`} className="btn btn-outline">{d.hero.cta}</Link>
      </div>
    </section>
  );
}
