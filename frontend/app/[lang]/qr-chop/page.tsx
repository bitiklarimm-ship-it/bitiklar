import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";
import PrintButton from "@/components/PrintButton";
import { apiGet, PUBLIC_API, qs, type InscriptionListItem, type Monument, type Paginated, type Region } from "@/lib/api";
import { getDict, label, pick, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Locale;
  return { title: getDict(lang).qrPrint.title, robots: { index: false } };
}

type SP = { tur?: string; region?: string; monument?: string };

/** Obida yoki bitik yoniga qo'yiladigan QR-taxtachalarni ommaviy chop etish (A4, 2×3). */
export default async function QrPrintPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<SP> }) {
  const lang = (await params).lang as Locale;
  const sp = await searchParams;
  const d = getDict(lang);
  const kind = sp.tur === "bitiklar" ? "bitiklar" : "obidalar";
  const regions = (await apiGet<Region[]>("/regions/", 3600)) || [];

  type Card = { key: string; title: string; sub: string; qr: string; kicker: string };
  let cards: Card[] = [];
  if (kind === "obidalar") {
    const data = await apiGet<Paginated<Monument>>(`/monuments/${qs({ page_size: 200, region: sp.region, ordering: "name_uz" })}`, 60);
    cards = (data?.results || []).map((m) => ({
      key: m.slug,
      title: pick(m, "name", lang),
      sub: [label(d, "kind", m.kind), m.city, m.period].filter(Boolean).join(" · "),
      kicker: `${m.inscriptions_count} ${d.monument.inscriptions}`,
      qr: `${PUBLIC_API}/api/monuments/${m.slug}/qr/?lang=${lang}`,
    }));
  } else {
    const data = await apiGet<Paginated<InscriptionListItem>>(
      `/inscriptions/${qs({ page_size: 200, region: sp.region, monument: sp.monument })}`, 60);
    cards = (data?.results || []).map((i) => ({
      key: i.slug,
      title: pick(i, "title", lang),
      sub: [pick(i.monument, "name", lang), i.monument.city, i.period_text].filter(Boolean).join(" · "),
      kicker: label(d, "language", i.language),
      qr: `${PUBLIC_API}/api/inscriptions/${i.slug}/qr/?lang=${lang}`,
    }));
  }

  const base = `/${lang}/qr-chop`;
  return (
    <div className="container qr-print">
      <div className="no-print" style={{ padding: "28px 0 12px" }}>
        <h1>{d.qrPrint.title}</h1>
        <p className="muted">{d.qrPrint.subtitle}</p>
        <form className="qr-filters" action={base}>
          <div className="seg">
            <Link className={kind === "obidalar" ? "active" : ""} href={`${base}${qs({ region: sp.region })}`}>{d.qrPrint.monuments}</Link>
            <Link className={kind === "bitiklar" ? "active" : ""} href={`${base}${qs({ tur: "bitiklar", region: sp.region })}`}>{d.qrPrint.inscriptions}</Link>
          </div>
          {kind === "bitiklar" && <input type="hidden" name="tur" value="bitiklar" />}
          <select className="input" name="region" defaultValue={sp.region || ""}>
            <option value="">{d.catalog.region}: {d.catalog.all}</option>
            {regions.map((r) => <option key={r.slug} value={r.slug}>{pick(r, "name", lang)}</option>)}
          </select>
          <button className="btn btn-outline" type="submit">{d.catalog.filter}</button>
          <PrintButton label={d.qrPrint.print} />
          <span className="muted">{cards.length}</span>
        </form>
      </div>

      <div className="qr-sheet">
        {cards.map((c) => (
          <div key={c.key} className="qr-card">
            <div className="qr-card-head"><Logo /> <b>BITIKLAR</b></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.qr} alt="QR" />
            <div className="qr-card-kicker">{c.kicker}</div>
            <div className="qr-card-title">{c.title}</div>
            <div className="qr-card-sub">{c.sub}</div>
            <div className="qr-card-hint">{d.qrPrint.scan}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
