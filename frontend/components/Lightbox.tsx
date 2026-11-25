"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LightboxImage = { url: string; original?: string; caption?: string; credit?: string };
type Labels = { close: string; original: string; zoomIn: string; zoomOut: string; reset: string; prev: string; next: string };

const MIN = 1;
const MAX = 8;

/** To'liq ekranda rasm ko'rish: g'ildirak/barmoq bilan kattalashtirish, surish, asl faylni ochish. */
export default function Lightbox({ images, start, onClose, labels }: {
  images: LightboxImage[]; start: number; onClose: () => void; labels: Labels;
}) {
  const [i, setI] = useState(start);
  const [z, setZ] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hq, setHq] = useState(false); // asl sifatli fayl yuklandimi
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const cur = images[i];

  const reset = useCallback(() => { setZ(1); setPos({ x: 0, y: 0 }); }, []);
  const go = useCallback((dir: number) => {
    setI((v) => (v + dir + images.length) % images.length);
    reset();
    setHq(false);
  }, [images.length, reset]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "+" || e.key === "=") setZ((v) => Math.min(MAX, v * 1.5));
      else if (e.key === "-") setZ((v) => Math.max(MIN, v / 1.5));
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [go, onClose]);

  // 2 martadan ortiq kattalashtirilganda asl (to'liq sifatli) faylga o'tamiz — xattotlik tafsilotlari uchun
  useEffect(() => { if (z >= 2 && cur.original) setHq(true); }, [z, cur.original]);
  useEffect(() => { if (z <= 1) setPos({ x: 0, y: 0 }); }, [z]);

  function onWheel(e: React.WheelEvent) {
    setZ((v) => Math.min(MAX, Math.max(MIN, v * (e.deltaY < 0 ? 1.2 : 1 / 1.2))));
  }
  function onDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
    }
  }
  function onMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      setZ(Math.min(MAX, Math.max(MIN, pinch.current.z * (d / pinch.current.d))));
    } else if (drag.current && z > 1) {
      setPos({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
    }
  }
  function onUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  const src = hq && cur.original ? cur.original : cur.url;

  return (
    <div className="lb" role="dialog" aria-modal="true">
      <div className="lb-bar">
        <span className="lb-count">{i + 1} / {images.length}</span>
        <div className="lb-tools">
          <button onClick={() => setZ((v) => Math.max(MIN, v / 1.5))} aria-label={labels.zoomOut} title={labels.zoomOut}>−</button>
          <span className="lb-zoom">{Math.round(z * 100)}%</span>
          <button onClick={() => setZ((v) => Math.min(MAX, v * 1.5))} aria-label={labels.zoomIn} title={labels.zoomIn}>+</button>
          <button onClick={reset} aria-label={labels.reset} title={labels.reset}>⟲</button>
          {cur.original && (
            <a href={cur.original} target="_blank" rel="noopener noreferrer" title={labels.original}>⬇ {labels.original}</a>
          )}
          <button onClick={onClose} aria-label={labels.close} title={labels.close}>✕</button>
        </div>
      </div>
      <div
        className="lb-stage"
        onWheel={onWheel}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onDoubleClick={() => (z > 1 ? reset() : setZ(2.5))}
        style={{ cursor: z > 1 ? "grab" : "zoom-in" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={cur.caption || ""}
          draggable={false}
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${z})` }}
        />
      </div>
      {images.length > 1 && (
        <>
          <button className="lb-nav lb-prev" onClick={() => go(-1)} aria-label={labels.prev}>‹</button>
          <button className="lb-nav lb-next" onClick={() => go(1)} aria-label={labels.next}>›</button>
        </>
      )}
      {(cur.caption || cur.credit) && (
        <div className="lb-caption">{cur.caption}{cur.credit ? ` · © ${cur.credit}` : ""}</div>
      )}
    </div>
  );
}
