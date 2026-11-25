"use client";

/** Saqlangan va yaqinda ko'rilgan bitiklar — foydalanuvchi brauzerida (ro'yxatdan o'tish shart emas). */
export type SavedItem = {
  slug: string; title_uz: string; title_ru: string; title_en: string;
  monument_uz: string; monument_ru: string; monument_en: string; image: string | null; at: number;
};

const KEYS = { saved: "bitiklar_saved", recent: "bitiklar_recent" } as const;
type Kind = keyof typeof KEYS;
const EVENT = "bitiklar:saved";

export function readList(kind: Kind): SavedItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEYS[kind]) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(kind: Kind, list: SavedItem[]) {
  try {
    localStorage.setItem(KEYS[kind], JSON.stringify(list));
    window.dispatchEvent(new Event(EVENT));
  } catch { /* xotira yopiq */ }
}

export function isSaved(slug: string) {
  return readList("saved").some((x) => x.slug === slug);
}

export function toggleSaved(item: Omit<SavedItem, "at">): boolean {
  const list = readList("saved");
  if (list.some((x) => x.slug === item.slug)) {
    write("saved", list.filter((x) => x.slug !== item.slug));
    return false;
  }
  write("saved", [{ ...item, at: Date.now() }, ...list].slice(0, 200));
  return true;
}

export function pushRecent(item: Omit<SavedItem, "at">) {
  const list = readList("recent").filter((x) => x.slug !== item.slug);
  write("recent", [{ ...item, at: Date.now() }, ...list].slice(0, 30));
}

export function clearList(kind: Kind) {
  write(kind, []);
}

export function onSavedChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener("storage", cb); };
}
