"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useDict } from "@/lib/useDict";

const Map3D = dynamic(() => import("./Map3D"), {
  ssr: false,
  loading: () => <div className="map3d-canvas skel" />,
});

/** "3D ko'rinish" tugmasi — bosilganda obida atrofi 3D'da (sun'iy yo'ldosh + relyef yoki 3D binolar) ochiladi. */
export default function Map3DButton({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const d = useDict();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <>
      <button className="btn btn-dark btn-sm" onClick={() => setOpen(true)}>🧭 {d.mapx.view3d}</button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-label={d.mapx.view3d} onClick={() => setOpen(false)}>
          <div className="modal-box modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <b>{title}</b>
              <button className="icon-btn" aria-label={d.ui.close} onClick={() => setOpen(false)}>✕</button>
            </div>
            <Map3D
              lat={lat}
              lng={lng}
              title={title}
              labels={{ satellite: d.mapx.mode3dSat, city: d.mapx.mode3dCity, rotate: d.mapx.rotate, stop: d.live.stop, hint: d.mapx.hint3d }}
            />
          </div>
        </div>
      )}
    </>
  );
}
