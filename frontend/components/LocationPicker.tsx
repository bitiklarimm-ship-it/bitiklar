"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { MAX_ZOOM } from "@/lib/tiles";
import { useDict } from "@/lib/useDict";
import BaseLayers from "./BaseLayers";
import { AutoResize, FullscreenControl } from "./MapTools";

type LatLng = { lat: number; lng: number };
type Labels = { myLocation: string; clear: string; satellite: string; scheme: string; denied: string; unavailable: string };

const pin = L.divIcon({
  className: "",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  html: `<div class="pin pin-active" style="width:30px;height:30px;background:#b88a3e"><span>✦</span></div>`,
});

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ target }: { target: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], Math.max(map.getZoom(), 17));
  }, [map, target]);
  return null;
}

/** Tadqiqotchi formasi uchun: xaritaga bosib yoki GPS orqali bitikning aniq joyini tanlash. */
export default function LocationPicker({
  value, onChange, reference, referenceLabel, labels,
}: {
  value: LatLng | null; onChange: (v: LatLng | null) => void;
  reference: LatLng | null; referenceLabel: string; labels: Labels;
}) {
  const d = useDict();
  const [target, setTarget] = useState<LatLng | null>(value || reference);
  const [msg, setMsg] = useState("");

  // Obida tanlanganda xarita shu obidaga ko'chadi (faqat koordinata o'zgarganda)
  const refLat = reference?.lat;
  const refLng = reference?.lng;
  useEffect(() => {
    if (refLat !== undefined && refLng !== undefined) setTarget({ lat: refLat, lng: refLng });
  }, [refLat, refLng]);

  function locate() {
    if (!("geolocation" in navigator)) { setMsg(labels.unavailable); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const v = { lat: p.coords.latitude, lng: p.coords.longitude };
        onChange(v); setTarget(v);
        setMsg(`±${Math.round(p.coords.accuracy)} m`);
      },
      (e) => setMsg(e.code === e.PERMISSION_DENIED ? labels.denied : labels.unavailable),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  const center: [number, number] = value ? [value.lat, value.lng] : reference ? [reference.lat, reference.lng] : [41.3, 64.6];
  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={locate}>📍 {labels.myLocation}</button>
        {value && <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange(null)}>✕ {labels.clear}</button>}
        {value && <code style={{ fontSize: ".85rem" }}>{value.lat.toFixed(6)}, {value.lng.toFixed(6)}</code>}
        {msg && <span className="muted" style={{ fontSize: ".85rem" }}>{msg}</span>}
      </div>
      <div className="map-mini" style={{ height: 320 }}>
        <MapContainer center={center} zoom={value || reference ? 18 : 6} maxZoom={MAX_ZOOM} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
          <BaseLayers labels={d.mapx} initial="hybrid" />
          <FullscreenControl label={d.mapx.fullscreen} />
          <AutoResize />
          <ClickHandler onPick={(p) => onChange(p)} />
          <Recenter target={target} />
          {reference && (
            <CircleMarker center={[reference.lat, reference.lng]} radius={8} pathOptions={{ color: "#555", fillColor: "#bbb", fillOpacity: 0.8 }}>
              <Tooltip>{referenceLabel}</Tooltip>
            </CircleMarker>
          )}
          {value && (
            <Marker
              position={[value.lat, value.lng]}
              icon={pin}
              draggable
              eventHandlers={{ dragend: (e) => { const p = (e.target as L.Marker).getLatLng(); onChange({ lat: p.lat, lng: p.lng }); } }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
