"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

export type MapPoint = { lat: number; lng: number; title: string; subtitle?: string; href?: string; count?: number; linkLabel?: string };

const icon = (count?: number) =>
  L.divIcon({
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -30],
    html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;
      background:#1b2f5b;color:#f1e3c6;border:2px solid #b88a3e;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      box-shadow:0 2px 6px rgba(0,0,0,.3);font:600 12px system-ui"><span style="transform:rotate(45deg)">${count ?? "•"}</span></div>`,
  });

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function MapView({ points, zoom = 6, className = "map-wrap", line = false }: { points: MapPoint[]; zoom?: number; className?: string; line?: boolean }) {
  // O'zbekiston markazi
  const center: [number, number] = points.length === 1 ? [points[0].lat, points[0].lng] : [41.3, 64.6];
  return (
    <div className={className}>
      <MapContainer center={center} zoom={points.length === 1 ? 16 : zoom} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={icon(p.count)}>
            <Popup>
              <b>{p.title}</b>
              {p.subtitle && <div style={{ color: "#6b6358" }}>{p.subtitle}</div>}
              {p.href && <div style={{ marginTop: 6 }}><a href={p.href}>{p.linkLabel || "→"}</a></div>}
            </Popup>
          </Marker>
        ))}
        {line && points.length > 1 && (
          <Polyline positions={points.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#b88a3e", weight: 4, dashArray: "8 8" }} />
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}
