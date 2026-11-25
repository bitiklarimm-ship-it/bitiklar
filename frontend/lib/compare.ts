"use client";

const KEY = "bitiklar_compare";
const EVENT = "bitiklar:compare";

export function getCompare(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, 2) : [];
  } catch {
    return [];
  }
}

export function setCompare(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-2)));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* */ }
}

/** Taqqoslashga qo'shish (eng ko'pi 2 ta: yangisi eskisining o'rnini egallaydi). */
export function toggleCompare(slug: string): string[] {
  const cur = getCompare();
  const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug].slice(-2);
  setCompare(next);
  return next;
}

export function onCompareChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}
