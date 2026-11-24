"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LOCALES, type Dict, type Locale } from "@/lib/i18n";
import Logo from "./Logo";

export default function Header({ lang, d }: { lang: Locale; d: Dict }) {
  const pathname = usePathname() || `/${lang}`;
  const [open, setOpen] = useState(false);
  const rest = pathname.replace(/^\/(uz|ru|en)/, "");

  const links = [
    { href: `/${lang}/bitiklar`, label: d.nav.catalog },
    { href: `/${lang}/obidalar`, label: d.nav.monuments },
    { href: `/${lang}/xarita`, label: d.nav.map },
    { href: `/${lang}/tadqiqotchilar`, label: d.nav.research },
    { href: `/${lang}/haqida`, label: d.nav.about },
  ];

  return (
    <header className="header">
      <div className="container header-inner">
        <Link href={`/${lang}`} className="logo" aria-label="BITIKLAR">
          <Logo /> BITIKLAR
        </Link>
        <nav className={`nav ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="lang">
            {LOCALES.map((l) => (
              <a
                key={l}
                href={`/${l}${rest}`}
                className={l === lang ? "active" : ""}
                onClick={() => { document.cookie = `lang=${l}; path=/; max-age=31536000`; }}
              >
                {l.toUpperCase()}
              </a>
            ))}
          </div>
          <button className="menu-btn" aria-label="Menu" onClick={() => setOpen(!open)}>☰</button>
        </div>
      </div>
    </header>
  );
}
