import type { MetadataRoute } from "next";

/** Saytni telefonga ilova kabi o'rnatish (bosh ekranga qo'shish). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BITIKLAR — tarix toshlarga bitilgan",
    short_name: "BITIKLAR",
    description: "O'zbekiston tarixiy obidalaridagi bitiklar, ularning tarjimasi va ma'nolari",
    start_url: "/uz",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d1834",
    theme_color: "#1e3a7b",
    lang: "uz",
    categories: ["education", "travel", "books"],
    icons: [{ src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Yaqinimdagi bitiklar", url: "/uz/xarita?joy=1" },
      { name: "Rasmdan aniqlash", url: "/uz/aniqlash" },
    ],
  };
}
