"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, MapContainer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import type { InscriptionFeature, MonumentFeature } from "@/lib/api";
import { arrow, bearing, distance, formatDistance } from "@/lib/geo";
import { label, pick, type Dict, type Locale } from "@/lib/i18n";
import { MAX_ZOOM } from "@/lib/tiles";
import BaseLayers from "./BaseLayers";
import { AutoResize, FullscreenControl } from "./MapTools";
import NavigateSheet from "./NavigateSheet";

type Pos = { lat: number; lng: number; acc: number };
type Item = { f: InscriptionFeature; lat: number; lng: number };
type Group = { key: string; lat: number; lng: number; items: Item[] };

const UZ: [number, number] = [41.3, 64.6];
const NEAR_METERS = 60; // shu masofaga yaqinlashganda "siz bitik yonidasiz" xabari chiqadi
const LANG_COLORS: Record<string, string> = { arabic: "#1f8a8a", persian: "#b88a3e", turkic: "#7a3e9d", other: "#6b6358" };

function groupIcon(g: Group, active: boolean) {
  const langs = new Set(g.items.map((i) => i.f.properties.language));
  const color = langs.size === 1 ? LANG_COLORS[[...langs][0]] || "#1b2f5b" : "#1b2f5b";
  const size = active ? 42 : 34;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
    html: `<div class="pin${active ? " pin-active" : ""}" style="width:${size}px;height:${size}px;background:${color}">
      <span>${g.items.length}</span></div>`,
  });
}

const monumentIcon = L.divIcon({
  className: "",
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  html: `<div class="mon-dot"></div>`,
});

const meIcon = L.divIcon({ className: "", iconSize: [22, 22], iconAnchor: [11, 11], html: `<div class="me-dot"></div>` });

/** Xarita obyektini tashqariga beradi va markaz o'zgarishini kuzatadi. */
function MapBridge({ onMap, onMove }: { onMap: (m: L.Map) => void; onMove: (c: L.LatLng) => void }) {
  const map = useMap();
  useEffect(() => { onMap(map); onMove(map.getCenter()); }, [map, onMap, onMove]);
  useMapEvents({ moveend: () => onMove(map.getCenter()) });
  return null;
}

export default function LiveMap({
  lang, d, inscriptions, monuments, focus, autostart = false,
}: {
  lang: Locale; d: Dict; inscriptions: InscriptionFeature[]; monuments: MonumentFeature[]; focus?: string; autostart?: boolean;
}) {
  const t = d.live;
  const [map, setMap] = useState<L.Map | null>(null);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [language, setLanguage] = useState("");
  const [showMonuments, setShowMonuments] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [watching, setWatching] = useState(false);
  const [follow, setFollow] = useState(true);
  const [msg, setMsg] = useState("");
  const [nearAlert, setNearAlert] = useState<Item | null>(null);
  const [selected, setSelected] = useState<string | null>(focus || null);
  const [navTarget, setNavTarget] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const closeNav = useCallback(() => setNavTarget(null), []);
  const watchId = useRef<number | null>(null);
  const firstFix = useRef(true);
  const alerted = useRef<Set<string>>(new Set());
  const followRef = useRef(follow);
  followRef.current = follow;

  const items: Item[] = useMemo(
    () =>
      inscriptions
        .filter((f) => !language || f.properties.language === language)
        .map((f) => ({ f, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] })),
    [inscriptions, language],
  );

  // Bir joydagi bitiklar bitta belgiga yig'iladi (masalan, bitta peshtoqdagi bir nechta yozuv)
  const groups: Group[] = useMemo(() => {
    const m = new Map<string, Group>();
    for (const it of items) {
      const key = `${it.lat.toFixed(5)},${it.lng.toFixed(5)}`;
      const g = m.get(key) || { key, lat: it.lat, lng: it.lng, items: [] };
      g.items.push(it);
      m.set(key, g);
    }
    return [...m.values()];
  }, [items]);

  const ref = pos || center;
  const nearby = useMemo(() => {
    if (!ref) return [];
    return items
      .map((it) => ({ ...it, dist: distance(ref.lat, ref.lng, it.lat, it.lng), dir: bearing(ref.lat, ref.lng, it.lat, it.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);
  }, [items, ref]);

  // Boshlang'ich ko'rinish: tanlangan bitik yoki barcha bitiklar
  const initialized = useRef(false);
  useEffect(() => {
    if (!map || initialized.current) return;
    initialized.current = true;
    const target = focus && inscriptions.find((f) => f.properties.slug === focus);
    if (target) {
      map.setView([target.geometry.coordinates[1], target.geometry.coordinates[0]], 18);
    } else if (inscriptions.length > 1) {
      map.fitBounds(L.latLngBounds(inscriptions.map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]])), { padding: [40, 40] });
    }
  }, [map, focus, inscriptions]);

  const stop = useCallback(() => {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
    setWatching(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(() => {
    if (typeof window !== "undefined" && !window.isSecureContext) { setMsg(t.insecure); return; }
    if (!("geolocation" in navigator)) { setMsg(t.unsupported); return; }
    setMsg(t.locating);
    setWatching(true);
    firstFix.current = true;
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const next = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy };
        setPos(next);
        setMsg("");
        if (map) {
          if (firstFix.current) map.setView([next.lat, next.lng], Math.max(map.getZoom(), 17));
          else if (followRef.current) map.panTo([next.lat, next.lng], { animate: true });
        }
        firstFix.current = false;
      },
      (err) => {
        setMsg(err.code === err.PERMISSION_DENIED ? t.denied : t.unavailable);
        if (err.code === err.PERMISSION_DENIED) stop();
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
  }, [map, stop, t]);

  // "Yaqinimdagi bitiklar" tugmasidan kelinganda joylashuv darhol yoqiladi
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autostart && map && !autoStarted.current) { autoStarted.current = true; start(); }
  }, [autostart, map, start]);

  // Bitikka yaqinlashganda xabar berish
  useEffect(() => {
    if (!pos) return;
    const close = nearby.find((n) => n.dist <= Math.max(NEAR_METERS, Math.min(pos.acc, 120)));
    if (close && !alerted.current.has(close.f.properties.slug)) {
      alerted.current.add(close.f.properties.slug);
      setNearAlert(close);
      try { navigator.vibrate?.(200); } catch { /* ixtiyoriy */ }
    }
  }, [pos, nearby]);

  const flyTo = (it: Item) => {
    setSelected(it.f.properties.slug);
    map?.setView([it.lat, it.lng], Math.max(map.getZoom(), 18));
    if (watching) setFollow(false);
  };

  const onMap = useCallback((m: L.Map) => setMap(m), []);
  const onMove = useCallback((c: L.LatLng) => setCenter({ lat: c.lat, lng: c.lng }), []);

  const usedLangs = useMemo(() => [...new Set(inscriptions.map((f) => f.properties.language))], [inscriptions]);
  const href = (slug: string) => `/${lang}/bitiklar/${slug}`;

  return (
    <div className="live">
      <div className="live-toolbar">
        {!watching ? (
          <button className="btn btn-dark" onClick={start}>📍 {t.locate}</button>
        ) : (
          <button className="btn btn-outline" onClick={stop}>■ {t.stop}</button>
        )}
        {watching && (
          <label className="chk">
            <input type="checkbox" checked={follow} onChange={(e) => setFollow(e.target.checked)} /> {t.follow}
          </label>
        )}
        <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label={d.catalog.language}>
          <option value="">{t.allLanguages}</option>
          {usedLangs.map((l) => <option key={l} value={l}>{label(d, "language", l)}</option>)}
        </select>
        <label className="chk">
          <input type="checkbox" checked={showMonuments} onChange={(e) => setShowMonuments(e.target.checked)} /> {t.layerMonuments}
        </label>
        <Link href={`/${lang}/aniqlash`} className="btn btn-outline btn-sm">📷 {d.identify.title}</Link>
        {pos && <span className="muted live-acc">{t.accuracy} ±{Math.round(pos.acc)} m</span>}
      </div>
      {msg && <div className={`alert ${msg === t.locating ? "warn" : "err"}`}>{msg}</div>}
      {nearAlert && (
        <div className="alert ok near-alert">
          <b>{t.near}:</b> {pick(nearAlert.f.properties, "title", lang)} — {pick(nearAlert.f.properties, "monument", lang)}{" "}
          <Link href={href(nearAlert.f.properties.slug)} className="btn btn-primary btn-sm">{t.open} →</Link>
          <button className="x" onClick={() => setNearAlert(null)} aria-label="×">×</button>
        </div>
      )}

      <NavigateSheet target={navTarget} onClose={closeNav} />
      <div className="live-grid">
        <div className="map-wrap live-map">
          <MapContainer center={UZ} zoom={6} maxZoom={MAX_ZOOM} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
            <BaseLayers labels={d.mapx} initial="street" />
            <FullscreenControl label={d.mapx.fullscreen} />
            <AutoResize />
            <MapBridge onMap={onMap} onMove={onMove} />

            {showMonuments && monuments.map((m) => (
              <Marker key={`m-${m.properties.slug}`} position={[m.geometry.coordinates[1], m.geometry.coordinates[0]]} icon={monumentIcon}>
                <Popup>
                  <b>{pick(m.properties, "name", lang)}</b>
                  <div className="muted">{label(d, "kind", m.properties.kind)} · {m.properties.city} · {m.properties.inscriptions_count} {t.inscriptions}</div>
                  <div style={{ marginTop: 6 }}><a href={`/${lang}/obidalar/${m.properties.slug}`}>{d.map.open} →</a></div>
                </Popup>
              </Marker>
            ))}

            {groups.map((g) => (
              <Marker
                key={g.key}
                position={[g.lat, g.lng]}
                icon={groupIcon(g, g.items.some((i) => i.f.properties.slug === selected))}
                eventHandlers={{ click: () => setSelected(g.items[0].f.properties.slug) }}
              >
                <Popup maxWidth={300}>
                  <div className="pop-list">
                    {g.items.map(({ f }) => (
                      <a key={f.properties.slug} href={href(f.properties.slug)} className="pop-item">
                        {f.properties.image_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={f.properties.image_url} alt="" />
                          : <span className="pop-ar arabic">{f.properties.original_text.slice(0, 18)}</span>}
                        <span>
                          <b>{pick(f.properties, "title", lang)}</b>
                          <small>{pick(f.properties, "monument", lang)} · {label(d, "language", f.properties.language)}
                            {" · "}{f.properties.precise ? t.precise : t.approx}</small>
                        </span>
                      </a>
                    ))}
                  </div>
                  <button className="btn btn-dark btn-sm" style={{ width: "100%" }}
                    onClick={() => setNavTarget({ lat: g.lat, lng: g.lng, name: pick(g.items[0].f.properties, "monument", lang) })}>
                    🧭 {t.directions}{pos ? ` · ${formatDistance(distance(pos.lat, pos.lng, g.lat, g.lng))}` : ""}
                  </button>
                </Popup>
              </Marker>
            ))}

            {pos && (
              <>
                <Circle center={[pos.lat, pos.lng]} radius={pos.acc} pathOptions={{ color: "#2a6df4", weight: 1, fillOpacity: 0.12 }} />
                <Marker position={[pos.lat, pos.lng]} icon={meIcon} zIndexOffset={1000}>
                  <Popup>{t.youAreHere} (±{Math.round(pos.acc)} m)</Popup>
                </Marker>
              </>
            )}
          </MapContainer>
        </div>

        <aside className="card live-side">
          <div className="card-body">
            <h3>{t.nearby}</h3>
            <p className="muted" style={{ fontSize: ".85rem" }}>{pos ? t.nearbyHint : t.centerHint}</p>
            {!nearby.length && <p className="muted">{t.nearbyEmpty}</p>}
            <ol className="nearby">
              {nearby.map((n) => (
                <li key={n.f.properties.slug} className={n.f.properties.slug === selected ? "active" : ""}>
                  <button className="near-main" onClick={() => flyTo(n)}>
                    <span className="near-dist">
                      {pos && <span className="near-arrow" aria-hidden>{arrow(n.dir)}</span>}
                      {formatDistance(n.dist)}
                    </span>
                    <span>
                      <b>{pick(n.f.properties, "title", lang)}</b>
                      <small>{pick(n.f.properties, "monument", lang)}{n.f.properties.city ? ` · ${n.f.properties.city}` : ""}</small>
                    </span>
                  </button>
                  <div className="near-links">
                    <Link href={href(n.f.properties.slug)}>{t.open}</Link>
                    <button className="linklike" onClick={() => setNavTarget({ lat: n.lat, lng: n.lng, name: pick(n.f.properties, "monument", lang) })}>{t.directions}</button>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}
