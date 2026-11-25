"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dict, Locale } from "@/lib/i18n";

const I = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  list: <path d="M4 5h16v3H4zM4 10.5h16v3H4zM4 16h16v3H4z" />,
  map: <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />,
  route: <path d="M6 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm12 12a3 3 0 1 1 0 6 3 3 0 0 1 0-6zM6 10v4a4 4 0 0 0 4 4h5v-2h-5a2 2 0 0 1-2-2v-4z" />,
  mosque: <path d="M12 2l1.2 2.4C16 5.6 18 8 18 11H6c0-3 2-5.4 4.8-6.6zM4 12h16v9h-6v-5a2 2 0 0 0-4 0v5H4z" />,
};

/** Telefon uchun pastki menyu — obida yonida bir qo'l bilan foydalanish qulay bo'lishi uchun. */
export default function MobileTabBar({ lang, d }: { lang: Locale; d: Dict }) {
  const p = usePathname() || "";
  const tabs = [
    { href: `/${lang}`, label: d.nav.home, icon: I.home, exact: true },
    { href: `/${lang}/bitiklar`, label: d.nav.catalog, icon: I.list },
    { href: `/${lang}/xarita`, label: d.nav.map, icon: I.map, main: true },
    { href: `/${lang}/obidalar`, label: d.nav.monuments, icon: I.mosque },
    { href: `/${lang}/yonalishlar`, label: d.nav.routes, icon: I.route },
  ];
  return (
    <nav className="tabbar" aria-label={d.ui.menu}>
      {tabs.map((t) => {
        const active = t.exact ? p === t.href : p.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} className={`${active ? "active" : ""} ${t.main ? "main" : ""}`}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">{t.icon}</svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
