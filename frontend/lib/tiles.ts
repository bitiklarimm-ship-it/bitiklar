/** Xarita qatlamlari. Hammasi bepul va API kalitsiz.
 *  - Sun'iy yo'ldosh: Esri World Imagery (+ joy nomlari va yo'llar ustki qatlami = "gibrid")
 *  - Xarita: CARTO Voyager (OpenStreetMap ma'lumotlari; OSM serverlari tashqi saytlarni bloklashi mumkin)
 *  - Relyef: OpenTopoMap
 */
export type TileDef = { url: string; attribution: string; maxNativeZoom: number; subdomains?: string };

export const TILES: Record<"satellite" | "labels" | "roads" | "street" | "dark" | "topo", TileDef> = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tasvirlar &copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 19,
  },
  labels: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    attribution: "",
    maxNativeZoom: 19,
  },
  roads: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    attribution: "",
    maxNativeZoom: 19,
  },
  street: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 20,
    subdomains: "abcd",
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxNativeZoom: 20,
    subdomains: "abcd",
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: 'Relyef: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), &copy; OpenStreetMap',
    maxNativeZoom: 17,
    subdomains: "abc",
  },
};

export const MAX_ZOOM = 21; // eng yaqin kattalashtirish (sun'iy yo'ldosh rasmi kattalashtirib ko'rsatiladi)

/** 3D xarita (MapLibre) uchun manbalar */
export const STYLE_3D_CITY = "https://tiles.openfreemap.org/styles/liberty";
export const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
