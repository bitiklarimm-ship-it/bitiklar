/** Xarita qatlamlari — bepul va API kalitsiz.
 *  - Xarita: CARTO Voyager (OpenStreetMap ma'lumotlari, tez va yengil)
 *  - Sun'iy yo'ldosh: Esri World Imagery (+ ixtiyoriy joy nomlari)
 *
 *  Esri O'zbekistonda ko'p joyda 18-darajagacha tasvir beradi; undan yaqinroqda shu tasvir
 *  kattalashtirib ko'rsatiladi ("Map data not yet available" o'rniga).
 */
export type TileDef = { url: string; attribution: string; maxNativeZoom: number; subdomains?: string; className?: string };

export const TILES = {
  street: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 19,
    subdomains: "abcd",
    className: "tiles-street",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tasvirlar &copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18,
  },
  labels: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    attribution: "",
    maxNativeZoom: 19,
    subdomains: "abcd",
  },
} satisfies Record<string, TileDef>;

export const MAX_ZOOM = 20;
