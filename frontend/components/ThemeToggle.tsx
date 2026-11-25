"use client";

import { useEffect, useState } from "react";

/** Yorug' / qorong'i ko'rinish. Tanlov brauzerda saqlanadi; tanlanmasa tizim sozlamasi ishlatiladi. */
export default function ThemeToggle({ labels }: { labels: { light: string; dark: string } }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    setDark(saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.dataset.theme = next ? "dark" : "light";
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* yopiq bo'lishi mumkin */ }
  }

  const label = dark ? labels.light : labels.dark;
  return (
    <button className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      {dark ? (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="currentColor" /></svg>
      )}
    </button>
  );
}
