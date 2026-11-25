"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PUBLIC_API } from "@/lib/api";
import { api, errorText } from "@/lib/client";
import { label, pick, type Dict, type Locale } from "@/lib/i18n";

type Overview = {
  counts: Record<"pending" | "suggestions" | "researchers" | "published" | "drafts" | "monuments" | "without_image" | "without_gps", number>;
  pending: { slug: string; title_uz: string; title_ru: string; title_en: string; monument: string; language: string; created_at: string; submitted_by: string | null }[];
  suggestions: { id: number; inscription: string; inscription_title: string; field: string; current_text: string; proposed_text: string; justification: string; author: string; created_at: string }[];
  researchers: { id: number; username: string; name: string; email: string; affiliation: string; academic_degree: string; orcid: string; date_joined: string }[];
  top: { slug: string; title_uz: string; title_ru: string; title_en: string; views_count: number }[];
  history: { date: string; type: "+" | "~" | "-"; slug: string; title: string; status: string; user: string | null }[];
};

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });

/** Muharrir paneli: ko'rib chiqish navbati, takliflar, tadqiqotchilarni tasdiqlash, so'nggi o'zgarishlar. */
export default function EditorPanel({ d, lang }: { d: Dict; lang: Locale }) {
  const e = d.editor;
  const [data, setData] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await api("/editor/overview/");
    if (res.ok) setData(await res.json());
    else setErr(await errorText(res, d.research.error));
  }, [d.research.error]);
  useEffect(() => { load(); }, [load]);

  async function act(key: string, path: string, body: Record<string, unknown>) {
    setBusy(key); setErr("");
    const res = await api(path, { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) setErr(await errorText(res, d.research.error));
    setBusy(null);
    load();
  }

  if (err && !data) return <div className="alert err">{err}</div>;
  if (!data) return <p className="muted">…</p>;
  const c = data.counts;
  const note = (k: string) => (
    <input className="input" placeholder={e.note} value={notes[k] || ""} onChange={(ev) => setNotes({ ...notes, [k]: ev.target.value })} />
  );

  return (
    <div className="editor">
      {err && <div className="alert err">{err}</div>}
      <div className="ed-stats">
        {([
          ["pending", e.pending], ["suggestions", e.suggestions], ["researchers", e.researchers],
          ["published", e.published], ["drafts", e.drafts], ["without_image", e.withoutImage], ["without_gps", e.withoutGps],
        ] as const).map(([k, t]) => (
          <div key={k} className={`card card-body ed-stat ${(k === "pending" || k === "suggestions" || k === "researchers") && c[k] ? "hot" : ""}`}>
            <b>{c[k]}</b><span>{t}</span>
          </div>
        ))}
      </div>
      <div className="ed-links">
        <a className="btn btn-outline btn-sm" href={`${PUBLIC_API}/admin/`}>⚙ {e.admin}</a>
        <Link className="btn btn-outline btn-sm" href={`/${lang}/qr-chop`}>▦ {e.qr}</Link>
        <a className="btn btn-outline btn-sm" href={`${PUBLIC_API}/api/export/csv/`}>⬇ CSV</a>
        <a className="btn btn-outline btn-sm" href={`${PUBLIC_API}/api/export/tei/`}>⬇ TEI</a>
      </div>

      <section className="block">
        <h2>{e.pending} ({c.pending})</h2>
        {!data.pending.length && <p className="muted">✓ {e.empty}</p>}
        {data.pending.map((i) => (
          <div key={i.slug} className="card card-body ed-item">
            <div>
              <b>{pick(i, "title", lang)}</b>
              <div className="ins-meta">{i.monument} · {label(d, "language", i.language)} · {i.submitted_by || "—"} · {fmt(i.created_at)}</div>
              <a className="muted" href={`${PUBLIC_API}/admin/catalog/inscription/?q=${encodeURIComponent(i.slug)}`} style={{ fontSize: ".85rem" }}>{e.admin} ↗</a>
            </div>
            <div className="ed-actions">
              {note(`i-${i.slug}`)}
              <button className="btn btn-dark btn-sm" disabled={busy === `i-${i.slug}`}
                onClick={() => act(`i-${i.slug}`, `/inscriptions/${i.slug}/approve/`, { note: notes[`i-${i.slug}`] || "" })}>✓ {e.approve}</button>
              <button className="btn btn-outline btn-sm" disabled={busy === `i-${i.slug}`}
                onClick={() => act(`i-${i.slug}`, `/inscriptions/${i.slug}/reject/`, { note: notes[`i-${i.slug}`] || "" })}>✕ {e.reject}</button>
            </div>
          </div>
        ))}
      </section>

      <section className="block">
        <h2>{e.suggestions} ({c.suggestions})</h2>
        {!data.suggestions.length && <p className="muted">✓ {e.empty}</p>}
        {data.suggestions.map((s) => (
          <div key={s.id} className="card card-body ed-item ed-col">
            <div>
              <Link href={`/${lang}/bitiklar/${s.inscription}`}><b>{s.inscription_title}</b></Link>
              <div className="ins-meta">{s.field} · {s.author} · {fmt(s.created_at)}</div>
            </div>
            <div className="ed-diff">
              {s.field !== "other" && <div><small>{e.current}</small><p>{s.current_text || "—"}</p></div>}
              <div className="new"><small>{e.proposed}</small><p>{s.proposed_text}</p></div>
            </div>
            {s.justification && <p className="muted" style={{ fontSize: ".9rem" }}>{s.justification}</p>}
            <div className="ed-actions">
              {note(`s-${s.id}`)}
              <button className="btn btn-dark btn-sm" disabled={busy === `s-${s.id}`}
                onClick={() => act(`s-${s.id}`, `/suggestions/${s.id}/accept/`, { note: notes[`s-${s.id}`] || "" })}>✓ {e.accept}</button>
              <button className="btn btn-outline btn-sm" disabled={busy === `s-${s.id}`}
                onClick={() => act(`s-${s.id}`, `/suggestions/${s.id}/decline/`, { note: notes[`s-${s.id}`] || "" })}>✕ {e.decline}</button>
            </div>
          </div>
        ))}
      </section>

      <section className="block">
        <h2>{e.researchers} ({c.researchers})</h2>
        {!data.researchers.length && <p className="muted">✓ {e.empty}</p>}
        {data.researchers.map((u) => (
          <div key={u.id} className="card card-body ed-item">
            <div>
              <b>{u.name || u.username}</b>
              <div className="ins-meta">
                {[u.academic_degree, u.affiliation, u.email, u.orcid && `ORCID ${u.orcid}`].filter(Boolean).join(" · ")} · {fmt(u.date_joined)}
              </div>
            </div>
            <div className="ed-actions">
              <button className="btn btn-dark btn-sm" disabled={busy === `u-${u.id}`}
                onClick={() => act(`u-${u.id}`, `/auth/researchers/${u.id}/verify/`, {})}>✓ {e.verify}</button>
              <button className="btn btn-outline btn-sm" disabled={busy === `u-${u.id}`}
                onClick={() => act(`u-${u.id}`, `/auth/researchers/${u.id}/verify/`, { action: "decline" })}>✕ {e.decline}</button>
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-2">
        <section className="card card-body">
          <h3>{e.history}</h3>
          <ul className="ed-history">
            {data.history.map((h, k) => (
              <li key={k}>
                <span className={`hist-type t${h.type === "+" ? "add" : h.type === "-" ? "del" : "mod"}`}>{h.type}</span>{" "}
                {h.type !== "-" ? <Link href={`/${lang}/bitiklar/${h.slug}`}>{h.title}</Link> : h.title}
                <small className="muted"> · {h.user || "—"} · {fmt(h.date)} · {d.research.status[h.status as keyof Dict["research"]["status"]] || h.status}</small>
              </li>
            ))}
          </ul>
        </section>
        <section className="card card-body">
          <h3>{e.top}</h3>
          <ol>
            {data.top.map((t) => (
              <li key={t.slug}><Link href={`/${lang}/bitiklar/${t.slug}`}>{pick(t, "title", lang)}</Link> <small className="muted">· {t.views_count}</small></li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
