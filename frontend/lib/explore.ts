import { getDict, type Locale } from "./i18n";

/** Barcha bo'limlar ro'yxati (Kashf etish sahifasi). */
export function exploreLinks(lang: Locale, d: ReturnType<typeof getDict>) {
  const e = d.explore;
  return [
    { href: `/${lang}/bitiklar`, icon: "📜", label: d.nav.catalog, desc: e.catalog },
    { href: `/${lang}/obidalar`, icon: "🕌", label: d.nav.monuments, desc: d.monument.subtitle },
    { href: `/${lang}/xarita`, icon: "📍", label: d.live.title, desc: e.map },
    { href: `/${lang}/yonalishlar`, icon: "🧭", label: d.routes.title, desc: e.routes },
    { href: `/${lang}/aniqlash`, icon: "📷", label: d.identify.title, desc: e.identify },
    { href: `/${lang}/shaxslar`, icon: "✒️", label: d.persons.title, desc: e.persons },
    { href: `/${lang}/oyatlar`, icon: "۞", label: d.quran.title, desc: e.quran },
    { href: `/${lang}/davrlar`, icon: "⏳", label: d.timeline.title, desc: e.timeline },
    { href: `/${lang}/lugat`, icon: "📖", label: d.glossary.title, desc: e.glossary },
    { href: `/${lang}/taqqoslash`, icon: "⇄", label: d.compare.title, desc: e.compare },
    { href: `/${lang}/viktorina`, icon: "🎯", label: d.quiz.title, desc: e.quiz },
    { href: `/${lang}/ovchi`, icon: "🏅", label: d.hunter.title, desc: e.hunter },
    { href: `/${lang}/saqlanganlar`, icon: "☆", label: d.saved.title, desc: e.saved },
  ];
}
