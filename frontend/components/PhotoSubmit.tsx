"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/client";
import { useDict } from "@/lib/useDict";

/** Tashrif buyuruvchi bitik rasmini yuboradi — muharrir tasdiqlagach galereyaga qo'shiladi. */
export default function PhotoSubmit({ inscription, monument }: { inscription?: string; monument?: string }) {
  const d = useDict();
  const p = d.photo;
  const [open, setOpen] = useState(false);
  const [v, setV] = useState({ author_name: "", author_email: "", note: "", consent: false });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true); setMsg(null);
    const fd = new FormData();
    fd.append("image", file);
    if (inscription) fd.append("inscription", inscription);
    if (monument) fd.append("monument", monument);
    fd.append("author_name", v.author_name);
    fd.append("author_email", v.author_email);
    fd.append("note", v.note);
    fd.append("consent", v.consent ? "true" : "false");
    const r = await api("/photos/", { method: "POST", body: fd });
    setBusy(false);
    if (r.ok) { setMsg({ ok: true, text: p.thanks }); setFile(null); setV({ ...v, note: "" }); }
    else setMsg({ ok: false, text: r.status === 429 ? d.ai.limit : await errorText(r, d.research.error) });
  }

  if (!open) {
    return (
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>📸 {p.open}</button>
    );
  }
  return (
    <form className="card card-body photo-form" onSubmit={send}>
      <h3 style={{ marginTop: 0 }}>📸 {p.title}</h3>
      <p className="muted" style={{ fontSize: ".88rem" }}>{p.hint}</p>
      {msg && <div className={`alert ${msg.ok ? "ok" : "err"}`}>{msg.text}</div>}
      <label className="field">{p.file}
        <input className="input" type="file" accept="image/*,.heic,.heif" required onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </label>
      <div className="row" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <label className="field">{p.name}<input className="input" required maxLength={120} value={v.author_name} onChange={(e) => setV({ ...v, author_name: e.target.value })} /></label>
        <label className="field">{p.email}<input className="input" type="email" value={v.author_email} onChange={(e) => setV({ ...v, author_email: e.target.value })} /></label>
      </div>
      <label className="field">{p.note}<textarea className="input" maxLength={500} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></label>
      <label className="chk" style={{ marginBottom: 14 }}>
        <input type="checkbox" required checked={v.consent} onChange={(e) => setV({ ...v, consent: e.target.checked })} /> {p.consent}
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn btn-dark" type="submit" disabled={busy || !file}>{busy ? "…" : p.send}</button>
        <button className="btn btn-outline" type="button" onClick={() => setOpen(false)}>{d.ui.close}</button>
      </div>
    </form>
  );
}
