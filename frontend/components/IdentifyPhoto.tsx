"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, errorText } from "@/lib/client";
import { formatDistance } from "@/lib/geo";
import { label, pick } from "@/lib/i18n";
import { useDict, useLang } from "@/lib/useDict";

type Candidate = {
  slug: string; title_uz: string; title_ru: string; title_en: string;
  monument_uz: string; monument_ru: string; monument_en: string; city: string; language: string;
  original_text: string; image_url: string | null; score: number; distance_m: number | null;
};
type Reading = { is_inscription?: boolean; text?: string; language?: string; known_formula?: string | null;
  monument_guess?: string | null; summary?: string; confidence?: number };

/** Obidadagi yozuvni suratga olib, katalogdan topish. */
export default function IdentifyPhoto() {
  const d = useDict();
  const lang = useLang();
  const t = d.identify;
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<{ reading: Reading; candidates: Candidate[] } | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  // Joylashuv — yaqin atrofdagi bitiklarni ustun qo'yish uchun (ixtiyoriy)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  async function run() {
    if (!file) return;
    setBusy(true); setErr(""); setRes(null);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("lang", lang);
    if (pos) { fd.append("lat", String(pos.lat)); fd.append("lng", String(pos.lng)); }
    const r = await api("/ai/identify/", { method: "POST", body: fd });
    setBusy(false);
    if (!r.ok) {
      setErr(r.status === 503 ? d.ai.off : r.status === 429 ? d.ai.limit : await errorText(r, d.research.error));
      return;
    }
    setRes(await r.json());
  }

  return (
    <div className="identify">
      <label className={`drop ${preview ? "has" : ""}`}>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          onChange={(e) => { setFile(e.target.files?.[0] || null); setRes(null); setErr(""); }}
        />
        {preview
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={preview} alt="" />
          : (
            <span className="drop-empty">
              <span className="drop-icon" aria-hidden="true">📷</span>
              <b>{t.take}</b>
              <small>{t.takeHint}</small>
            </span>
          )}
      </label>
      <div className="identify-actions">
        <button className="btn btn-dark" disabled={!file || busy} onClick={run}>{busy ? t.reading : `✨ ${t.run}`}</button>
        {file && <button className="btn btn-outline" onClick={() => { setFile(null); setRes(null); }}>{t.another}</button>}
        <span className="muted" style={{ fontSize: ".85rem" }}>{pos ? `📍 ${t.locOn}` : t.locOff}</span>
      </div>
      {busy && <div className="ai-thinking"><span /><span /><span /> {t.reading}</div>}
      {err && <div className="alert warn">{err}</div>}

      {res && (
        <div className="identify-result">
          <div className="card card-body">
            <div className="kicker">{t.aiRead}</div>
            {res.reading.text && <div className="original" style={{ fontSize: "1.6rem", padding: 18, margin: "8px 0" }}>{res.reading.text}</div>}
            {res.reading.summary && <p style={{ margin: "8px 0" }}>{res.reading.summary}</p>}
            <div className="tags">
              {res.reading.language && <span className="tag">{label(d, "language", res.reading.language)}</span>}
              {res.reading.known_formula && <span className="tag gold">{res.reading.known_formula}</span>}
              {res.reading.monument_guess && <span className="tag">🕌 {res.reading.monument_guess}</span>}
              {typeof res.reading.confidence === "number" && <span className="tag">{d.research.confidence}: {Math.round(res.reading.confidence * 100)}%</span>}
            </div>
            <p className="ai-note">{d.ai.disclaimer}</p>
          </div>

          <h3 style={{ marginTop: 24 }}>{res.candidates.length ? t.matches : t.noMatch}</h3>
          <div className="grid grid-3">
            {res.candidates.map((c) => (
              <Link key={c.slug} href={`/${lang}/bitiklar/${c.slug}`} className={`card ins-card lang-${c.language}`}>
                <div className="ins-thumb">
                  {c.image_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={c.image_url} alt="" loading="lazy" />
                    : <div className="arabic">{c.original_text.slice(0, 50)}</div>}
                  <span className="lang-badge">{Math.round(c.score * 100)}%</span>
                </div>
                <div className="card-body">
                  <h3>{pick(c, "title", lang)}</h3>
                  <div className="ins-meta">
                    {pick(c, "monument", lang)}{c.city ? ` · ${c.city}` : ""}
                    {c.distance_m !== null ? ` · ${formatDistance(c.distance_m)}` : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
