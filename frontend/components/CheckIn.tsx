"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { distance, formatDistance } from "@/lib/geo";
import { addVisit, CHECKIN_RADIUS, getVisits, onVisitsChange } from "@/lib/hunter";
import { useDict, useLang } from "@/lib/useDict";

/** Obida yonida turib "Men shu yerdaman" — GPS tasdiqlasa, "Bitik ovchisi" to'plamiga qo'shiladi. */
export default function CheckIn({ monument }: {
  monument: { slug: string; name_uz: string; name_ru: string; name_en: string; city: string; lat: number; lng: number };
}) {
  const d = useDict();
  const lang = useLang();
  const h = d.hunter;
  const [visited, setVisited] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const load = () => setVisited(!!getVisits()[monument.slug]);
    load();
    return onVisitsChange(load);
  }, [monument.slug]);

  function check() {
    if (!("geolocation" in navigator)) { setMsg(d.live.unsupported); return; }
    setBusy(true); setMsg("");
    navigator.geolocation.getCurrentPosition((p) => {
      setBusy(false);
      const dist = distance(p.coords.latitude, p.coords.longitude, monument.lat, monument.lng);
      if (dist <= CHECKIN_RADIUS + Math.min(p.coords.accuracy, 100)) {
        const { lat: _a, lng: _b, ...rest } = monument;
        addVisit(rest);
        setMsg(`🎉 ${h.success}`);
        try { navigator.vibrate?.([80, 40, 80]); } catch { /* */ }
      } else {
        setMsg(`${h.tooFar} ${formatDistance(dist)}`);
      }
    }, (e) => {
      setBusy(false);
      setMsg(e.code === e.PERMISSION_DENIED ? d.live.denied : d.live.unavailable);
    }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
  }

  return (
    <div className="card card-body checkin">
      <div className="checkin-head">
        <span className="checkin-icon" aria-hidden="true">{visited ? "🏅" : "📍"}</span>
        <div>
          <b>{visited ? h.visited : h.checkTitle}</b>
          <small className="muted">{visited ? h.visitedHint : h.checkHint}</small>
        </div>
      </div>
      {!visited && <button className="btn btn-dark btn-sm" onClick={check} disabled={busy}>{busy ? d.live.locating : h.checkBtn}</button>}
      {msg && <div className="checkin-msg">{msg}</div>}
      <Link href={`/${lang}/ovchi`} className="link-arrow" style={{ fontSize: ".88rem" }}>{h.myProgress} →</Link>
    </div>
  );
}
