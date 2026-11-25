"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LOCALES, type Dict, type Locale } from "@/lib/i18n";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";

export default function Header({ lang, d }: { lang: Locale; d: Dict }) {
  const pathname = usePathname() || `/${lang}`;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const rest = pathname.replace(/^\/(uz|ru|en)/, "");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Sahifa almashganda menyular yopiladi
  useEffect(() => { setOpen(false); setSearchOpen(false); }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setOpen(false); }
      // "/" yoki Ctrl+K — qidiruvni ochish
      const tag = (e.target as HTMLElement)?.tagName;
      if ((e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const links = [
    { href: `/${lang}/bitiklar`, label: d.nav.catalog },
    { href: `/${lang}/obidalar`, label: d.nav.monuments },
    { href: `/${lang}/xarita`, label: d.nav.map },
    { href: `/${lang}/yonalishlar`, label: d.nav.routes },
    { href: `/${lang}/tadqiqotchilar`, label: d.nav.research },
    { href: `/${lang}/haqida`, label: d.nav.about },
  ];

  return (
    <header className={`header ${scrolled ? "scrolled" : ""}`}>
      <div className="container header-inner">
        <Link href={`/${lang}`} className="logo" aria-label="BITIKLAR">
          <Logo /> <span>BITIKLAR</span>
        </Link>
        <nav className={`nav ${open ? "open" : ""}`} aria-label={d.ui.menu}>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <button className="icon-btn" aria-label={d.ui.search} title={`${d.ui.search} ( / )`} onClick={() => setSearchOpen(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
          <ThemeToggle labels={{ light: d.ui.light, dark: d.ui.dark }} />
          <div className="lang" role="group" aria-label="Til / Язык / Language">
            {LOCALES.map((l) => (
              <a
                key={l}
                href={`/${l}${rest}`}
                className={l === lang ? "active" : ""}
                hrefLang={l}
                onClick={() => { document.cookie = `lang=${l}; path=/; max-age=31536000`; }}
              >
                {l.toUpperCase()}
              </a>
            ))}
          </div>
          <button className="icon-btn menu-btn" aria-label={open ? d.ui.close : d.ui.menu} aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="search-overlay" onClick={() => setSearchOpen(false)}>
          <form
            className="search-box"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchRef.current?.value.trim();
              router.push(`/${lang}/bitiklar${q ? `?q=${encodeURIComponent(q)}` : ""}`);
              setSearchOpen(false);
            }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input ref={searchRef} name="q" placeholder={d.ui.searchHint} aria-label={d.ui.search} autoComplete="off" />
            <kbd>Esc</kbd>
          </form>
        </div>
      )}
    </header>
  );
}
