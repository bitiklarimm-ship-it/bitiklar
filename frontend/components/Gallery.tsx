"use client";

import { useState } from "react";
import type { InscriptionImage } from "@/lib/api";
import { useDict } from "@/lib/useDict";
import Lightbox from "./Lightbox";

type Labels = { noImage: string; show: string; hide: string };

export default function Gallery({ images, fallbackText, labels }: { images: InscriptionImage[]; fallbackText: string; labels: Labels }) {
  const [i, setI] = useState(0);
  const [showAnn, setShowAnn] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const [lb, setLb] = useState(false);
  const d = useDict();
  if (!images.length) {
    return (
      <div className="card">
        <div className="gallery-main girih" style={{ flexDirection: "column", padding: 30 }}>
          <div className="arabic" style={{ color: "#f1e3c6", fontSize: "2rem", textAlign: "center", lineHeight: 1.9 }}>{fallbackText}</div>
          <div style={{ color: "#c9cfdd", marginTop: 12, fontSize: ".85rem" }}>{labels.noImage}</div>
        </div>
      </div>
    );
  }
  const cur = images[Math.min(i, images.length - 1)];
  const ann = cur.annotations || [];
  return (
    <div className="card">
      {/* Belgilar bo'lsa rasm o'z nisbatida ko'rsatiladi — ramkalar aniq joyida turishi uchun */}
      <div className={`gallery-main ${ann.length ? "has-ann" : ""}`}>
        <div className="ann-stage">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cur.url}
            alt={cur.caption || ""}
            onClick={() => setLb(true)}
            style={{ cursor: "zoom-in" }}
            title={d.img.open}
          />
          <button className="zoom-hint" onClick={() => setLb(true)} aria-label={d.img.open}>⤢ {d.img.open}</button>
          {showAnn && ann.map((a, k) => (
            <div
              key={k}
              className={`ann-box ${hover === k ? "hot" : ""}`}
              style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.w}%`, height: `${a.h}%` }}
              title={a.label}
              onMouseEnter={() => setHover(k)}
              onMouseLeave={() => setHover(null)}
            >
              <span>{k + 1}</span>
            </div>
          ))}
        </div>
      </div>
      {(cur.caption || cur.credit) && (
        <div className="card-body muted" style={{ fontSize: ".85rem", paddingBottom: 6 }}>
          {cur.caption}{cur.credit ? ` · © ${cur.credit}` : ""}
        </div>
      )}
      {!!ann.length && (
        <div className="card-body ann-legend">
          <button className="btn btn-outline btn-sm" onClick={() => setShowAnn(!showAnn)}>
            {showAnn ? labels.hide : labels.show}
          </button>
          {showAnn && (
            <ol>
              {ann.map((a, k) => (
                <li key={k} className={hover === k ? "hot" : ""} onMouseEnter={() => setHover(k)} onMouseLeave={() => setHover(null)}>
                  {a.label || "—"}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {lb && (
        <Lightbox
          images={images.map((im) => ({ url: im.url, original: im.original_url, caption: im.caption, credit: im.credit }))}
          start={Math.min(i, images.length - 1)}
          onClose={() => setLb(false)}
          labels={{ close: d.ui.close, original: d.img.original, zoomIn: d.img.zoomIn, zoomOut: d.img.zoomOut, reset: d.img.reset, prev: d.catalog.prev, next: d.catalog.next }}
        />
      )}
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((im, k) => (
            <button key={im.id} className={k === i ? "active" : ""} onClick={() => setI(k)} aria-label={`${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumb_url || im.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
