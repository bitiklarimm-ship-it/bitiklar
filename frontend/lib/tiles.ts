/** Xarita qatlamlari — API kalitsiz ishlaydi.
 *  - Xarita: OpenStreetMap (kalit shart emas). Agar NEXT_PUBLIC_CARTO_KEY berilsa — CARTO Voyager.
 *  - Sun'iy yo'ldosh: Esri World Imagery (kalitsiz)
 *  - Gibrid nomlar: Esri World_Boundaries_and_Places (kalitsiz). Kalit bo'lsa — CARTO nomlari.
 *
 *  CARTO 2026-yildan boshlab kalitsiz so'rovlarga "API key required" yozuvini qo'yadi,
 *  shuning uchun u faqat kalit berilganda ishlatiladi.
 */
export type TileDef = { url: string; attribution: string; maxNativeZoom: number; subdomains?: string; className?: string };

const CARTO_KEY = (process.env.NEXT_PUBLIC_CARTO_KEY || "").trim();
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";

const street: TileDef = CARTO_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
      attribution: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
      maxNativeZoom: 19,
      subdomains: "abcd",
      className: "tiles-street",
    }
  : {
      url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: OSM_ATTR,
      maxNativeZoom: 19,
      className: "tiles-street",
    };

const labels: TileDef = CARTO_KEY
  ? {
      url: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`,
      attribution: "",
      maxNativeZoom: 19,
      subdomains: "abcd",
    }
  : {
      url: `${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
      attribution: "",
      maxNativeZoom: 18,
    };

export const TILES = {
  street,
  satellite: {
    url: `${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    attribution: "Tasvirlar &copy; Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18,
  } as TileDef,
  labels,
};

export const MAX_ZOOM = 20;
