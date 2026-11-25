/** Geografik yordamchilar: masofa, yo'nalish, formatlash. */

const R = 6371000; // Yer radiusi, metr

const rad = (d: number) => (d * Math.PI) / 180;

/** Ikki nuqta orasidagi masofa (metr), haversine formulasi. */
export function distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Birinchi nuqtadan ikkinchisiga yo'nalish (0° = shimol, soat yo'nalishida). */
export function bearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const y = Math.sin(rad(lng2 - lng1)) * Math.cos(rad(lat2));
  const x = Math.cos(rad(lat1)) * Math.sin(rad(lat2)) - Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(rad(lng2 - lng1));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
export function arrow(deg: number): string {
  return ARROWS[Math.round(deg / 45) % 8];
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m / 5) * 5} m`;
  if (m < 10000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 1000)} km`;
}

/** Piyoda yo'l ko'rsatish (OpenStreetMap). */
export function directionsUrl(from: { lat: number; lng: number } | null, to: { lat: number; lng: number }): string {
  const t = `${to.lat.toFixed(6)},${to.lng.toFixed(6)}`;
  if (!from) return `https://www.openstreetmap.org/?mlat=${to.lat}&mlon=${to.lng}#map=18/${to.lat}/${to.lng}`;
  const f = `${from.lat.toFixed(6)},${from.lng.toFixed(6)}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${f}%3B${t}`;
}
