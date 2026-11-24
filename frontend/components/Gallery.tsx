"use client";

import { useState } from "react";

type Img = { id: number; url: string; caption: string; credit: string };

export default function Gallery({ images, fallbackText, noImage }: { images: Img[]; fallbackText: string; noImage: string }) {
  const [i, setI] = useState(0);
  if (!images.length) {
    return (
      <div className="card">
        <div className="gallery-main girih" style={{ flexDirection: "column", padding: 30 }}>
          <div className="arabic" style={{ color: "#f1e3c6", fontSize: "2rem", textAlign: "center", lineHeight: 1.9 }}>{fallbackText}</div>
          <div style={{ color: "#c9cfdd", marginTop: 12, fontSize: ".85rem" }}>{noImage}</div>
        </div>
      </div>
    );
  }
  const cur = images[i];
  return (
    <div className="card">
      <div className="gallery-main">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.url} alt={cur.caption || ""} />
      </div>
      {(cur.caption || cur.credit) && (
        <div className="card-body muted" style={{ fontSize: ".85rem", paddingBottom: 6 }}>
          {cur.caption}{cur.credit ? ` · © ${cur.credit}` : ""}
        </div>
      )}
      {images.length > 1 && (
        <div className="thumbs">
          {images.map((im, k) => (
            <button key={im.id} className={k === i ? "active" : ""} onClick={() => setI(k)} aria-label={`${k + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
