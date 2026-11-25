import Link from "next/link";
import type { BriefIns } from "@/lib/api";
import { label, pick, type Dict, type Locale } from "@/lib/i18n";

/** Ixcham bitik qatori (ko'rsatkichlar va vaqt chizig'i uchun). */
export default function BriefRow({ it, lang, d, extra }: { it: BriefIns; lang: Locale; d: Dict; extra?: string }) {
  return (
    <Link href={`/${lang}/bitiklar/${it.slug}`} className={`brief lang-${it.language}`}>
      <span className="brief-ar arabic">{it.original_text.slice(0, 40)}</span>
      <span className="brief-main">
        <b>{pick(it, "title", lang)}</b>
        <small>
          {pick(it, "monument", lang)}{it.city ? ` · ${it.city}` : ""}
          {it.period_text ? ` · ${it.period_text}` : it.year_from ? ` · ${it.year_from}` : ""}
          {" · "}{label(d, "language", it.language)}
        </small>
      </span>
      {extra && <span className="brief-extra">{extra}</span>}
    </Link>
  );
}
