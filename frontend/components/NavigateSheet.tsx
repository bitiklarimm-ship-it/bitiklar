"use client";

import { useEffect } from "react";
import { useDict } from "@/lib/useDict";
import NavigatorButtons from "./NavigatorButtons";

/** Pastdan chiquvchi oyna: navigator ilovasini tanlash. */
export default function NavigateSheet({ target, onClose }: { target: { lat: number; lng: number; name: string } | null; onClose: () => void }) {
  const d = useDict();
  useEffect(() => {
    if (!target) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [target, onClose]);
  if (!target) return null;
  return (
    <div className="modal sheet" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <b>🧭 {d.where.howTo}: {target.name}</b>
          <button className="icon-btn" aria-label={d.ui.close} onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <NavigatorButtons lat={target.lat} lng={target.lng} name={target.name} />
        </div>
      </div>
    </div>
  );
}
