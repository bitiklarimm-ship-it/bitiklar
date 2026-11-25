"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Monument, RouteStop } from "@/lib/api";
import { api } from "@/lib/client";
import { arrow, bearing, directionsUrl, distance, formatDistance } from "@/lib/geo";
import { addVisit } from "@/lib/hunter";
import { label, pick } from "@/lib/i18n";
import { useDict, useLang } from "@/lib/useDict";
import ReadAloud from "./ReadAloud";

const ARRIVE_METERS = 60;

/** Yo'nalish bo'yicha gid: GPS orqali keyingi bekatga yo'l, yetib kelganda bitiklar avtomatik ochiladi. */
export default function RouteGuide({ stops, routeSlug }: { stops: RouteStop[]; routeSlug: string }) {
  const d = useDict();
  const lang = useLang();
  const g = d.guide;
  const storeKey = `bitiklar_guide_${routeSlug}`;
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [arrived, setArrived] = useState<Record<number, boolean>>({});
  const [detail, setDetail] = useState<Monument | null>(null);
  const [err, setErr] = useState("");
  const watch = useRef<number | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);

  // Davom ettirish uchun qaysi bekatda qolganini eslab qolamiz
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(storeKey) || "{}");
      if (typeof s.idx === "number") setIdx(Math.min(s.idx, stops.length - 1));
      if (s.arrived) setArrived(s.arrived);
    } catch { /* */ }
  }, [storeKey, stops.length]);
  useEffect(() => {
    try { localStorage.setItem(storeKey, JSON.stringify({ idx, arrived })); } catch { /* */ }
  }, [storeKey, idx, arrived]);

  // GPS kuzatuvi va ekran o'chmasligi
  useEffect(() => {
    if (!("geolocation" in navigator)) { setErr(d.live.unsupported); return; }
    watch.current = navigator.geolocation.watchPosition(
      (p) => { setPos({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }); setErr(""); if (p.coords.heading !== null && !Number.isNaN(p.coords.heading)) setHeading(p.coords.heading); },
      (e) => setErr(e.code === e.PERMISSION_DENIED ? d.live.denied : d.live.unavailable),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
    );
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((w) => { wake.current = w; }).catch(() => undefined);
    return () => {
      if (watch.current !== null) navigator.geolocation.clearWatch(watch.current);
      wake.current?.release().catch(() => undefined);
    };
  }, [d.live.denied, d.live.unavailable, d.live.unsupported]);

  const stop = stops[idx];
  const m = stop.monument;
  const lat = Number(m.latitude), lng = Number(m.longitude);
  const dist = pos ? distance(pos.lat, pos.lng, lat, lng) : null;
  const dir = pos ? bearing(pos.lat, pos.lng, lat, lng) : null;
  const rel = dir !== null && heading !== null ? (dir - heading + 360) % 360 : dir;

  const arrive = useCallback(() => {
    setArrived((a) => ({ ...a, [idx]: true }));
    addVisit({ slug: m.slug, name_uz: m.name_uz, name_ru: m.name_ru, name_en: m.name_en, city: m.city });
    try { navigator.vibrate?.([120, 60, 120]); } catch { /* */ }
  }, [idx, m]);

  // Avtomatik yetib kelish
  useEffect(() => {
    if (dist !== null && pos && !arrived[idx] && dist <= Math.max(ARRIVE_METERS, Math.min(pos.acc, 100))) arrive();
  }, [dist, pos, idx, arrived, arrive]);

  // Bekatga yetganda obida bitiklarini yuklaymiz
  useEffect(() => {
    setDetail(null);
    if (!arrived[idx]) return;
    api(`/monuments/${m.slug}/`).then(async (r) => r.ok && setDetail(await r.json()));
  }, [arrived, idx, m.slug]);

  const done = Object.keys(arrived).length;
  return (
    <div className="guide">
      <div className="guide-steps">
        {stops.map((s, k) => (
          <button key={s.id} className={`gs ${k === idx ? "cur" : ""} ${arrived[k] ? "ok" : ""}`} onClick={() => setIdx(k)}
            aria-label={`${k + 1}. ${pick(s.monument, "name", lang)}`}>{arrived[k] ? "✓" : k + 1}</button>
        ))}
        <span className="muted" style={{ fontSize: ".85rem" }}>{done}/{stops.length}</span>
      </div>

      <div className="card guide-card">
        <div className="guide-compass">
          <div className="compass" aria-hidden="true">
            <span className="needle" style={{ transform: `rotate(${rel ?? 0}deg)`, opacity: rel === null ? 0.25 : 1 }}>➤</span>
          </div>
          <div className="guide-dist">
            {arrived[idx] ? <b className="ok-text">✓ {g.arrived}</b> : dist !== null ? <b>{formatDistance(dist)}</b> : <b>…</b>}
            <small className="muted">{dir !== null && !arrived[idx] ? `${arrow(dir)} ${heading === null ? g.northUp : g.ahead}` : pos ? `±${Math.round(pos.acc)} m` : d.live.locating}</small>
          </div>
        </div>
        <div className="card-body">
          <div className="kicker">{g.stop} {idx + 1} / {stops.length}</div>
          <h2 style={{ margin: "4px 0" }}>{pick(m, "name", lang)}</h2>
          <p className="muted" style={{ margin: 0 }}>{label(d, "kind", m.kind)} · {m.city}{m.period ? ` · ${m.period}` : ""}</p>
          {pick(stop, "note", lang) && <p className="guide-note">💡 {pick(stop, "note", lang)}</p>}
          {err && <div className="alert warn" style={{ marginTop: 10 }}>{err}</div>}
          <div className="hero-actions" style={{ marginTop: 14 }}>
            {!arrived[idx] && <a className="btn btn-dark" href={directionsUrl(pos, { lat, lng })} target="_blank" rel="noopener noreferrer">🧭 {d.live.directions}</a>}
            {!arrived[idx] && <button className="btn btn-outline" onClick={arrive}>{g.imHere}</button>}
            {arrived[idx] && idx < stops.length - 1 && <button className="btn btn-primary" onClick={() => setIdx(idx + 1)}>{g.next} →</button>}
            {arrived[idx] && idx === stops.length - 1 && <span className="ok-text">🎉 {g.finished}</span>}
          </div>
        </div>
      </div>

      {arrived[idx] && (
        <div className="block" style={{ marginTop: 20 }}>
          {detail && pick(detail, "description", lang) && (
            <div className="card card-body block">
              <ReadAloud text={pick(detail, "description", lang)} lang={lang} labels={d.speech} />
              <p className="prose" style={{ marginTop: 10 }}>{pick(detail, "description", lang)}</p>
            </div>
          )}
          <h3>{d.monument.list}</h3>
          {!detail && <p className="muted">{d.ui.loading}</p>}
          <div className="brief-list">
            {(detail?.inscriptions || []).map((it) => (
              <Link key={it.slug} href={`/${lang}/bitiklar/${it.slug}`} className={`brief lang-${it.language}`}>
                <span className="brief-ar arabic">{it.original_text.slice(0, 40)}</span>
                <span className="brief-main"><b>{pick(it, "title", lang)}</b><small>{label(d, "language", it.language)}</small></span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
