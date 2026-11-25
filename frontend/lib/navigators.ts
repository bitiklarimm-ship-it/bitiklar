/** Navigator va xarita ilovalariga havolalar (manzilgacha yo'l ko'rsatish). */
export type NavApp = { key: string; name: string; color: string; letter: string; url: string; mobileOnly?: boolean; androidOnly?: boolean };

const f = (n: number) => n.toFixed(6);

export function navApps(lat: number, lng: number, name = ""): NavApp[] {
  const q = encodeURIComponent(name);
  return [
    { key: "yandexnavi", name: "Yandex Navigator", color: "#ffcc00", letter: "Я",
      url: `yandexnavi://build_route_on_map?lat_to=${f(lat)}&lon_to=${f(lng)}`, mobileOnly: true },
    { key: "yandex", name: "Yandex Xaritalar", color: "#fc3f1d", letter: "Я",
      url: `https://yandex.uz/maps/?rtext=~${f(lat)}%2C${f(lng)}&rtt=auto` },
    { key: "google", name: "Google Maps", color: "#1a73e8", letter: "G",
      url: `https://www.google.com/maps/dir/?api=1&destination=${f(lat)},${f(lng)}` },
    { key: "2gis", name: "2GIS", color: "#19aa1e", letter: "2",
      url: `https://2gis.uz/routeSearch/rsType/car/to/${f(lng)},${f(lat)}` },
    { key: "apple", name: "Apple Xaritalar", color: "#111111", letter: "A",
      url: `https://maps.apple.com/?daddr=${f(lat)},${f(lng)}${q ? `&q=${q}` : ""}` },
    { key: "waze", name: "Waze", color: "#33ccff", letter: "W",
      url: `https://waze.com/ul?ll=${f(lat)},${f(lng)}&navigate=yes` },
    { key: "osm", name: "OpenStreetMap (piyoda)", color: "#7ebc6f", letter: "O",
      url: `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=%3B${f(lat)}%2C${f(lng)}` },
    { key: "geo", name: "Boshqa ilova", color: "#5f6573", letter: "⋯",
      url: `geo:${f(lat)},${f(lng)}?q=${f(lat)},${f(lng)}${q ? `(${q})` : ""}`, androidOnly: true },
  ];
}

export function platform(): { mobile: boolean; android: boolean; ios: boolean } {
  if (typeof navigator === "undefined") return { mobile: false, android: false, ios: false };
  const ua = navigator.userAgent;
  const android = /Android/i.test(ua);
  const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return { mobile: android || ios, android, ios };
}
