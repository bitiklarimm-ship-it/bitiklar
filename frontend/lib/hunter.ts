"use client";

/** "Bitik ovchisi": tashrif buyurilgan obidalar (GPS bilan tasdiqlangan), qurilmada saqlanadi. */
export type Visit = { slug: string; name_uz: string; name_ru: string; name_en: string; city: string; at: number };

const KEY = "bitiklar_visits";
const EVENT = "bitiklar:visits";
export const CHECKIN_RADIUS = 150; // metr

export function getVisits(): Record<string, Visit> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}

export function addVisit(v: Omit<Visit, "at">) {
  const all = getVisits();
  if (all[v.slug]) return false;
  all[v.slug] = { ...v, at: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* */ }
  return true;
}

export function onVisitsChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}

export type Badge = { key: string; icon: string; need: number; got: number; done: boolean };

/** Nishonlar: tashriflar soni va shaharlar bo'yicha */
export function badges(visits: Record<string, Visit>, totalMonuments: number, cityTotals: Record<string, number>): Badge[] {
  const list = Object.values(visits);
  const n = list.length;
  const out: Badge[] = [
    { key: "first", icon: "🌱", need: 1, got: n, done: n >= 1 },
    { key: "three", icon: "🧭", need: 3, got: n, done: n >= 3 },
    { key: "five", icon: "🏺", need: 5, got: n, done: n >= 5 },
    { key: "ten", icon: "🏛", need: 10, got: n, done: n >= 10 },
    { key: "all", icon: "👑", need: totalMonuments, got: n, done: totalMonuments > 0 && n >= totalMonuments },
  ];
  for (const [city, total] of Object.entries(cityTotals)) {
    if (total < 2) continue;
    const got = list.filter((v) => v.city === city).length;
    out.push({ key: `city:${city}`, icon: "🏙", need: total, got, done: got >= total });
  }
  return out;
}
