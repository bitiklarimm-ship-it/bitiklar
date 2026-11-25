import Link from "next/link";
import type { InscriptionListItem } from "@/lib/api";
import { label, pick, type Dict, type Locale } from "@/lib/i18n";

export default function InscriptionCard({ item, lang, d }: { item: InscriptionListItem; lang: Locale; d: Dict }) {
  return (
    <Link href={`/${lang}/bitiklar/${item.slug}`} className={`card ins-card lang-${item.language}`}>
      <div className="ins-thumb">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image_url} alt={pick(item, "title", lang)} loading="lazy" />
        ) : (
          <div className="arabic">{item.original_text.slice(0, 60)}</div>
        )}
        <span className="lang-badge">{label(d, "language", item.language)}</span>
      </div>
      <div className="card-body">
        <h3>{pick(item, "title", lang)}</h3>
        <div className="ins-meta">
          {pick(item.monument, "name", lang)}{item.monument.city ? ` · ${item.monument.city}` : ""}
        </div>
        <div className="tags">
          {item.script !== "other" && <span className="tag">{label(d, "script", item.script)}</span>}
          {item.period_text && <span className="tag gold">{item.period_text}</span>}
        </div>
      </div>
    </Link>
  );
}
