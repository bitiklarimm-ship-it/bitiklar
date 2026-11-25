"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { MAX_ZOOM } from "@/lib/tiles";
import { useDict } from "@/lib/useDict";
import BaseLayers from "./BaseLayers";
import { AutoResize, CooperativeGestures, FullscreenControl } from "./MapTools";

export type MapPoint = { lat: number; lng: number; title: string; subtitle?: string; href?: string; count?: number; linkLabel?: string };

const icon = (count?: number) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
    html: `<div class="pin" style="width:34px;height:34px;background:#1e3a7b"><span>${count ?? "•"}</span></div>`,
  });

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat},${p.lng}`).join("|");
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

export default function MapView({ points, zoom = 6, className = "map-wrap", line = false }: { points: MapPoint[]; zoom?: number; className?: string; line?: boolean }) {
  const d = useDict();
  const single = points.length === 1;
  const mini = className.includes("map-mini");
  const center: [number, number] = single ? [points[0].lat, points[0].lng] : [41.3, 64.6];
  return (
    <div className={className}>
      <MapContainer
        center={center}
        zoom={single ? 17 : zoom}
        maxZoom={MAX_ZOOM}
        scrollWheelZoom={!mini}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Bitta obida — sun'iy yo'ldoshda (bino ko'rinadi), ko'p nuqta — oddiy xaritada */}
        <BaseLayers labels={d.mapx} initial={single ? "hybrid" : "street"} />
        <FullscreenControl label={d.mapx.fullscreen} />
        <AutoResize />
        {mini && <CooperativeGestures hint={d.mapx.twoFingers} />}
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={icon(p.count)}>
            <Popup>
              <b>{p.title}</b>
              {p.subtitle && <div className="muted">{p.subtitle}</div>}
              {p.href && <div style={{ marginTop: 6 }}><a href={p.href}>{p.linkLabel || "→"}</a></div>}
            </Popup>
          </Marker>
        ))}
        {line && points.length > 1 && (
          <Polyline positions={points.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#d6aa5c", weight: 4, dashArray: "8 8" }} />
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
