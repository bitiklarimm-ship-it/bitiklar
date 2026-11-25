"use client";

import { useEffect, useState } from "react";
import { useMap } from "react-leaflet";

/** Xaritani butun ekranga yoyish (Fullscreen API, bo'lmasa CSS orqali). */
export default function FullscreenButton({ label }: { label: string }) {
  const map = useMap();
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = map.getContainer().parentElement;
    const onChange = () => {
      const fs = document.fullscreenElement === el;
      if (!fs && el?.classList.contains("map-fs")) return; // CSS rejimi
      setOn(fs);
      setTimeout(() => map.invalidateSize(), 200);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [map]);

  function toggle() {
    const el = map.getContainer().parentElement;
    if (!el) return;
    if (!on) {
      if (el.requestFullscreen) el.requestFullscreen().catch(() => { el.classList.add("map-fs"); setOn(true); });
      else { el.classList.add("map-fs"); setOn(true); }
    } else {
      if (document.fullscreenElement) document.exitFullscreen();
      el.classList.remove("map-fs");
      setOn(false);
    }
    setTimeout(() => map.invalidateSize(), 250);
  }

  return (
    <div className="leaflet-top leaflet-left" style={{ marginTop: 80 }}>
      <div className="leaflet-control leaflet-bar">
        <a href="#" role="button" title={label} aria-label={label} className="fs-btn"
          onClick={(e) => { e.preventDefault(); toggle(); }}>{on ? "⤡" : "⤢"}</a>
      </div>
    </div>
  );
}
