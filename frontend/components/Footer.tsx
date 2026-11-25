import Link from "next/link";
import { PUBLIC_API } from "@/lib/api";
import type { Dict, Locale } from "@/lib/i18n";
import Logo from "./Logo";

export default function Footer({ lang, d }: { lang: Locale; d: Dict }) {
  return (
    <footer className="footer girih">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="logo"><Logo light /> BITIKLAR</div>
            <p style={{ marginTop: 12, maxWidth: 420 }}>{d.meta.description}</p>
          </div>
          <div>
            <p><Link href={`/${lang}/bitiklar`}>{d.nav.catalog}</Link></p>
            <p><Link href={`/${lang}/obidalar`}>{d.nav.monuments}</Link></p>
            <p><Link href={`/${lang}/xarita`}>{d.nav.map}</Link></p>
            <p><Link href={`/${lang}/yonalishlar`}>{d.nav.routes}</Link></p>
          </div>
          <div>
            <p><Link href={`/${lang}/tadqiqotchilar`}>{d.nav.research}</Link></p>
            <p><Link href={`/${lang}/haqida`}>{d.nav.about}</Link></p>
            <p>{d.exportData.title}: <a href={`${PUBLIC_API}/api/export/csv/`}>CSV</a> · <a href={`${PUBLIC_API}/api/export/json/`}>JSON</a> · <a href={`${PUBLIC_API}/api/export/tei/`}>TEI</a></p>
            <p>bitiklar.uz</p>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} BITIKLAR — {d.footer.tagline}. {d.footer.rights}. Xarita: © OpenStreetMap contributors.
        </div>
      </div>
    </footer>
  );
}
