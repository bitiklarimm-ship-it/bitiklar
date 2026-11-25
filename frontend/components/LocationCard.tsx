"use client";

import { useState } from "react";
import { distance, formatDistance } from "@/lib/geo";
import { useDict } from "@/lib/useDict";
import NavigatorButtons from "./NavigatorButtons";

/** "Qayerda joylashgan va qanday borish": manzil, koordinata, mendan masofa, navigatorlar, ulashish. */
export default function LocationCard({ lat, lng, name, address }: { lat: number; lng: number; name: string; address?: string }) {
  const d = useDict();
  const w = d.where;
  const [dist, setDist] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  function measure() {
    if (!("geolocation" in navigator)) { setDist(d.live.unsupported); return; }
    setDist(d.live.locating);
    navigator.geolocation.getCurrentPosition(
      (p) => setDist(`${w.fromYou}: ${formatDistance(distance(p.coords.latitude, p.coords.longitude, lat, lng))}`),
      (e) => setDist(e.code === e.PERMISSION_DENIED ? d.live.denied : d.live.unavailable),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }
  async function copy() {
    try { await navigator.clipboard.writeText(coords); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
  }
  async function share() {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    try {
      if (navigator.share) await navigator.share({ title: name, text: `${name} — ${coords}`, url });
      else { await navigator.clipboard.writeText(`${name}: ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    } catch { /* bekor qilindi */ }
  }

  return (
    <div className="card card-body loc-card">
      <h3 style={{ marginTop: 0 }}>📍 {w.title}</h3>
      {address && <p style={{ margin: "0 0 6px" }}>{address}</p>}
      <div className="loc-row">
        <code className="loc-coords">{coords}</code>
        <button className="btn btn-outline btn-sm" onClick={copy}>{copied ? `✓ ${d.ui.copied}` : w.copy}</button>
        <button className="btn btn-outline btn-sm" onClick={share}>↗ {d.ui.share}</button>
      </div>
      <div className="loc-row">
        <button className="btn btn-outline btn-sm" onClick={measure}>📏 {w.measure}</button>
        {dist && <span className="muted" style={{ fontSize: ".9rem" }}>{dist}</span>}
      </div>
      <div className="kicker" style={{ margin: "14px 0 8px" }}>{w.howTo}</div>
      <NavigatorButtons lat={lat} lng={lng} name={name} />
    </div>
  );
}
