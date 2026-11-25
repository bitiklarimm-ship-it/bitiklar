"use client";

import { useState } from "react";

/** Bitik sahifasi: ulashish (telefonda tizim oynasi) va asl matndan nusxa olish. */
export default function ShareBar({ title, text, labels }: {
  title: string; text: string; labels: { share: string; linkCopied: string; copyText: string; copied: string };
}) {
  const [note, setNote] = useState("");
  const flash = (m: string) => { setNote(m); setTimeout(() => setNote(""), 1800); };

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title, url });
      else { await navigator.clipboard.writeText(url); flash(labels.linkCopied); }
    } catch { /* foydalanuvchi bekor qildi */ }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); flash(labels.copied); } catch { /* clipboard yopiq */ }
  }

  return (
    <div className="share-bar">
      <button className="btn btn-ghost btn-sm" onClick={share}>↗ {labels.share}</button>
      <button className="btn btn-ghost btn-sm" onClick={copy}>⧉ {labels.copyText}</button>
      {note && <span className="share-note" role="status">✓ {note}</span>}
    </div>
  );
}
