"use client";

import { usePathname } from "next/navigation";
import { getDict, isLocale, type Locale } from "./i18n";

/** Mijoz komponentlarida joriy til va lug'atni URL'dan olish. */
export function useLang(): Locale {
  const seg = (usePathname() || "/uz").split("/")[1] || "uz";
  return isLocale(seg) ? seg : "uz";
}

export function useDict() {
  return getDict(useLang());
}
