"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { InscriptionListItem, Monument } from "@/lib/api";
import { api, errorText, getTokens, setTokens } from "@/lib/client";
import { label, pick, type Dict, type Locale } from "@/lib/i18n";
import EditorPanel from "./EditorPanel";
import LocationPicker from "./LocationPickerLoader";

type User = {
  id: number; username: string; first_name: string; last_name: string; role: string;
  is_verified: boolean; can_submit: boolean; is_editor: boolean;
};

type Tab = "submit" | "mine" | "suggest" | "ai" | "editor";

const EMPTY_FORM = {
  monument: "", title_uz: "", title_ru: "", title_en: "", placement_uz: "", placement_ru: "", placement_en: "",
  language: "arabic", script: "other", technique: "other", original_text: "", transliteration: "",
  translation_uz: "", translation_ru: "", translation_en: "", commentary_uz: "", commentary_ru: "", commentary_en: "",
  period_text: "", year_from: "", year_to: "", hijri_date: "", calligrapher: "", sources: "",
  latitude: "", longitude: "",
};
type Form = typeof EMPTY_FORM;

export default function ResearchPortal({ lang, d, initialSlug, initialTab }: { lang: Locale; d: Dict; initialSlug: string; initialTab?: string }) {
  const r = d.research;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>(initialSlug ? "suggest" : initialTab === "editor" ? "editor" : "submit");

  const loadMe = useCallback(async () => {
    if (!getTokens()) { setLoading(false); return; }
    const res = await api("/auth/me/");
    setUser(res.ok ? await res.json() : null);
    setLoading(false);
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  if (loading) return <p className="muted">…</p>;
  if (!user) return <AuthForms d={d} onDone={loadMe} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <b>{user.first_name || user.username} {user.last_name}</b>{" "}
          <span className="muted">· {user.is_editor ? "Editor" : user.role}</span>
        </div>
        <button className="btn btn-outline" onClick={() => { setTokens(null); setUser(null); }}>{r.logout}</button>
      </div>

      {!user.can_submit && (
        <div className="alert warn">{user.role === "researcher" ? r.waiting : r.readerOnly}</div>
      )}

      {user.can_submit && (
        <>
          <div className="tabs">
            {user.is_editor && (
              <button className={tab === "editor" ? "active" : ""} onClick={() => setTab("editor")}>★ {d.editor.tab}</button>
            )}
            {(Object.keys(r.tabs) as (keyof typeof r.tabs)[]).map((k) => (
              <button key={k} className={tab === k ? "active" : ""} onClick={() => setTab(k)}>{r.tabs[k]}</button>
            ))}
          </div>
          <TabPanels tab={tab} setTab={setTab} lang={lang} d={d} initialSlug={initialSlug} />
        </>
      )}
    </div>
  );
}

function TabPanels({ tab, setTab, lang, d, initialSlug }: { tab: Tab; setTab: (t: Tab) => void; lang: Locale; d: Dict; initialSlug: string }) {
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  return (
    <>
      {tab === "editor" && <EditorPanel d={d} lang={lang} />}
      {tab === "submit" && <SubmitForm d={d} lang={lang} form={form} setForm={setForm} photo={photo} setPhoto={setPhoto} />}
      {tab === "mine" && <Mine d={d} lang={lang} />}
      {tab === "suggest" && <SuggestForm d={d} initialSlug={initialSlug} />}
      {tab === "ai" && (
        <AIAnalyze d={d} onUse={(patch, file) => { setForm({ ...form, ...patch }); setPhoto(file); setTab("submit"); }} />
      )}
    </>
  );
}

function AuthForms({ d, onDone }: { d: Dict; onDone: () => void }) {
  const r = d.research;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [v, setV] = useState({ username: "", password: "", email: "", first_name: "", last_name: "", affiliation: "", academic_degree: "", as_researcher: true });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setV({ ...v, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "register") {
        const res = await api("/auth/register/", { method: "POST", body: JSON.stringify(v) });
        if (!res.ok) { setErr(await errorText(res, r.error)); return; }
      }
      const res = await api("/auth/token/", { method: "POST", body: JSON.stringify({ username: v.username, password: v.password }) });
      if (!res.ok) { setErr(await errorText(res, r.error)); return; }
      setTokens(await res.json());
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card card-body" style={{ maxWidth: 520, margin: "0 auto", padding: 28 }}>
      <div className="tabs">
        <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>{r.login}</button>
        <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>{r.register}</button>
      </div>
      {err && <div className="alert err">{err}</div>}
      <form onSubmit={submit}>
        <label className="field">{r.username}<input className="input" required value={v.username} onChange={set("username")} autoComplete="username" /></label>
        <label className="field">{r.password}<input className="input" type="password" required value={v.password} onChange={set("password")} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {mode === "register" && (
          <>
            <label className="field">{r.email}<input className="input" type="email" value={v.email} onChange={set("email")} /></label>
            <div className="row" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <label className="field">{r.firstName}<input className="input" value={v.first_name} onChange={set("first_name")} /></label>
              <label className="field">{r.lastName}<input className="input" value={v.last_name} onChange={set("last_name")} /></label>
            </div>
            <label className="field">{r.affiliation}<input className="input" value={v.affiliation} onChange={set("affiliation")} /></label>
            <label className="field">{r.degree}<input className="input" value={v.academic_degree} onChange={set("academic_degree")} /></label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <input type="checkbox" checked={v.as_researcher} onChange={set("as_researcher")} /> {r.asResearcher}
            </label>
          </>
        )}
        <button className="btn btn-dark" disabled={busy} type="submit">{mode === "login" ? r.login : r.register}</button>
      </form>
    </div>
  );
}

function SubmitForm({ d, lang, form, setForm, photo, setPhoto }: {
  d: Dict; lang: Locale; form: Form; setForm: (f: Form) => void; photo: File | null; setPhoto: (f: File | null) => void;
}) {
  const r = d.research;
  const [monuments, setMonuments] = useState<Monument[]>([]);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/monuments/?page_size=100&ordering=name_uz").then(async (res) => {
      if (res.ok) setMonuments((await res.json()).results);
    });
  }, []);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  async function send(status: "draft" | "pending") {
    setMsg(null); setBusy(true);
    try {
      const { sources, year_from, year_to, latitude, longitude, ...rest } = form;
      const body = {
        ...rest, status,
        year_from: year_from ? Number(year_from) : null,
        year_to: year_to ? Number(year_to) : null,
        latitude: latitude ? Number(latitude).toFixed(6) : null,
        longitude: longitude ? Number(longitude).toFixed(6) : null,
        sources: sources.split("\n").map((s) => s.trim()).filter(Boolean).map((citation) => ({ citation, kind: "book" })),
      };
      const res = await api("/inscriptions/", { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) { setMsg({ kind: "err", text: await errorText(res, r.error) }); return; }
      const created = await res.json();
      if (photo) {
        const fd = new FormData();
        fd.append("image", photo);
        fd.append("is_primary", "true");
        await api(`/inscriptions/${created.slug}/images/`, { method: "POST", body: fd });
      }
      setForm(EMPTY_FORM); setPhoto(null);
      setMsg({ kind: "ok", text: r.sent });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setBusy(false);
    }
  }

  const sel = (group: "language" | "script" | "technique", k: keyof Form) => (
    <select className="input" value={form[k]} onChange={set(k)}>
      {Object.entries(d.labels[group]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  const t = d.inscription;
  const selMon = monuments.find((m) => m.slug === form.monument);
  const monLat = selMon ? Number(selMon.latitude) : null;
  const monLng = selMon ? Number(selMon.longitude) : null;
  const monumentPos = useMemo(() => (monLat !== null && monLng !== null ? { lat: monLat, lng: monLng } : null), [monLat, monLng]);

  return (
    <form className="card card-body" style={{ padding: 28 }} onSubmit={(e) => { e.preventDefault(); send("pending"); }}>
      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
      <label className="field">{r.monumentSlug}
        <select className="input" required value={form.monument} onChange={set("monument")}>
          <option value="">—</option>
          {monuments.map((m) => <option key={m.slug} value={m.slug}>{pick(m, "name", lang)} ({m.city})</option>)}
        </select>
      </label>
      <div className="row">
        <label className="field">Sarlavha (UZ)<input className="input" required value={form.title_uz} onChange={set("title_uz")} /></label>
        <label className="field">Заголовок (RU)<input className="input" value={form.title_ru} onChange={set("title_ru")} /></label>
        <label className="field">Title (EN)<input className="input" value={form.title_en} onChange={set("title_en")} /></label>
      </div>
      <div className="row">
        <label className="field">{t.placement} (UZ)<input className="input" value={form.placement_uz} onChange={set("placement_uz")} /></label>
        <label className="field">{t.placement} (RU)<input className="input" value={form.placement_ru} onChange={set("placement_ru")} /></label>
        <label className="field">{t.placement} (EN)<input className="input" value={form.placement_en} onChange={set("placement_en")} /></label>
      </div>
      <div className="row">
        <label className="field">{t.language}{sel("language", "language")}</label>
        <label className="field">{t.script}{sel("script", "script")}</label>
        <label className="field">{t.technique}{sel("technique", "technique")}</label>
      </div>
      <label className="field">{t.original}<textarea className="input arabic" style={{ fontSize: "1.4rem" }} required value={form.original_text} onChange={set("original_text")} /></label>
      <label className="field">{t.transliteration}<textarea className="input" value={form.transliteration} onChange={set("transliteration")} /></label>
      <div className="row">
        <label className="field">Tarjima (UZ)<textarea className="input" value={form.translation_uz} onChange={set("translation_uz")} /></label>
        <label className="field">Перевод (RU)<textarea className="input" value={form.translation_ru} onChange={set("translation_ru")} /></label>
        <label className="field">Translation (EN)<textarea className="input" value={form.translation_en} onChange={set("translation_en")} /></label>
      </div>
      <div className="row">
        <label className="field">Izoh (UZ)<textarea className="input" value={form.commentary_uz} onChange={set("commentary_uz")} /></label>
        <label className="field">Комментарий (RU)<textarea className="input" value={form.commentary_ru} onChange={set("commentary_ru")} /></label>
        <label className="field">Commentary (EN)<textarea className="input" value={form.commentary_en} onChange={set("commentary_en")} /></label>
      </div>
      <div className="row" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <label className="field">{t.period}<input className="input" value={form.period_text} onChange={set("period_text")} placeholder="XV asr, 1420-yillar" /></label>
        <label className="field">{d.catalog.yearFrom}<input className="input" type="number" value={form.year_from} onChange={set("year_from")} /></label>
        <label className="field">{d.catalog.yearTo}<input className="input" type="number" value={form.year_to} onChange={set("year_to")} /></label>
      </div>
      <div className="row" style={{ gridTemplateColumns: "1fr 2fr" }}>
        <label className="field">{t.hijri}<input className="input" value={form.hijri_date} onChange={set("hijri_date")} /></label>
        <label className="field">{t.calligrapher}<input className="input" value={form.calligrapher} onChange={set("calligrapher")} /></label>
      </div>
      <label className="field">{t.sources} <span style={{ fontWeight: 400 }}>({r.sourcesHint})</span>
        <textarea className="input" value={form.sources} onChange={set("sources")} />
      </label>
      <div className="field">
        <b>{d.picker.title}</b>
        <p className="muted" style={{ fontSize: ".85rem", margin: "4px 0 8px" }}>{d.picker.hint}</p>
        <LocationPicker
          value={form.latitude && form.longitude ? { lat: Number(form.latitude), lng: Number(form.longitude) } : null}
          onChange={(v) => setForm({ ...form, latitude: v ? String(v.lat) : "", longitude: v ? String(v.lng) : "" })}
          reference={monumentPos}
          referenceLabel={pick(selMon, "name", lang)}
          labels={{
            myLocation: d.picker.myLocation, clear: d.picker.clear, satellite: d.live.satellite,
            scheme: d.live.scheme, denied: d.live.denied, unavailable: d.live.unavailable,
          }}
        />
      </div>
      <label className="field">{r.photo}
        <input className="input" type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        {photo && <span className="muted"> {photo.name}</span>}
      </label>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-dark" disabled={busy} type="submit">{r.submit}</button>
        <button className="btn btn-outline" disabled={busy} type="button" onClick={() => send("draft")}>{r.saveDraft}</button>
      </div>
    </form>
  );
}

function Mine({ d, lang }: { d: Dict; lang: Locale }) {
  const [items, setItems] = useState<(InscriptionListItem & { review_note?: string })[] | null>(null);
  useEffect(() => {
    api("/inscriptions/mine/").then(async (res) => setItems(res.ok ? (await res.json()).results : []));
  }, []);
  if (!items) return <p className="muted">…</p>;
  if (!items.length) return <p className="muted">{d.catalog.empty}</p>;
  return (
    <div className="card">
      {items.map((it) => (
        <div key={it.id} className="card-body" style={{ borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div>
            {it.status === "published"
              ? <Link href={`/${lang}/bitiklar/${it.slug}`}><b>{pick(it, "title", lang)}</b></Link>
              : <b>{pick(it, "title", lang)}</b>}
            <div className="ins-meta">{pick(it.monument, "name", lang)} · {label(d, "language", it.language)}</div>
          </div>
          <span className={`status ${it.status}`}>{d.research.status[it.status as keyof Dict["research"]["status"]]}</span>
        </div>
      ))}
    </div>
  );
}

const SUGGEST_FIELDS = [
  "original_text", "transliteration", "translation_uz", "translation_ru", "translation_en",
  "commentary_uz", "commentary_ru", "commentary_en", "period_text", "calligrapher", "other",
];

function SuggestForm({ d, initialSlug }: { d: Dict; initialSlug: string }) {
  const r = d.research;
  const [v, setV] = useState({ inscription: initialSlug, field: "translation_uz", proposed_text: "", justification: "" });
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await api("/suggestions/", { method: "POST", body: JSON.stringify(v) });
    if (res.ok) { setMsg({ kind: "ok", text: r.sent }); setV({ ...v, proposed_text: "", justification: "" }); }
    else setMsg({ kind: "err", text: await errorText(res, r.error) });
  }

  return (
    <form className="card card-body" style={{ padding: 28, maxWidth: 760 }} onSubmit={submit}>
      {msg && <div className={`alert ${msg.kind}`}>{msg.text}</div>}
      <div className="row" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <label className="field">{r.inscriptionSlug}<input className="input" required value={v.inscription} onChange={set("inscription")} /></label>
        <label className="field">{r.field}
          <select className="input" value={v.field} onChange={set("field")}>
            {SUGGEST_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
      </div>
      <label className="field">{r.proposed}<textarea className="input" required value={v.proposed_text} onChange={set("proposed_text")} /></label>
      <label className="field">{r.justification}<textarea className="input" value={v.justification} onChange={set("justification")} /></label>
      <button className="btn btn-dark" type="submit">{r.submit}</button>
    </form>
  );
}

function AIAnalyze({ d, onUse }: { d: Dict; onUse: (patch: Partial<Form>, file: File | null) => void }) {
  const r = d.research;
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Record<string, any> | null>(null);
  const [err, setErr] = useState("");

  async function run() {
    if (!file) return;
    setBusy(true); setErr(""); setRes(null);
    const fd = new FormData();
    fd.append("image", file);
    fd.append("hint", hint);
    const out = await api("/ai/analyze/", { method: "POST", body: fd });
    if (out.ok) setRes(await out.json());
    else setErr(await errorText(out, r.error));
    setBusy(false);
  }

  const keys: (keyof Form)[] = ["language", "script", "technique", "original_text", "transliteration", "translation_uz", "translation_ru", "translation_en"];

  return (
    <div className="card card-body" style={{ padding: 28 }}>
      <div className="alert warn">{r.aiWarn}</div>
      <label className="field">{r.photo}<input className="input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
      <label className="field">{r.aiHint}<input className="input" value={hint} onChange={(e) => setHint(e.target.value)} /></label>
      <button className="btn btn-dark" disabled={!file || busy} onClick={run}>{busy ? "…" : r.aiRun}</button>
      {err && <div className="alert err" style={{ marginTop: 16 }}>{err}</div>}
      {res && (
        <div style={{ marginTop: 24 }}>
          {res.original_text && <div className="original" style={{ marginBottom: 12 }}>{res.original_text}</div>}
          <dl className="meta-list">
            {keys.slice(0, 3).map((k) => res[k] && <div key={k}><dt>{k}</dt><dd>{res[k]}</dd></div>)}
            {res.identified_source && <div><dt>source</dt><dd>{res.identified_source}</dd></div>}
            {res.confidence !== undefined && <div><dt>{r.confidence}</dt><dd>{Math.round(Number(res.confidence) * 100)}%</dd></div>}
          </dl>
          {res.transliteration && <p className="translit" style={{ marginTop: 12 }}>{res.transliteration}</p>}
          {["translation_uz", "translation_ru", "translation_en"].map((k) => res[k] && <div key={k} className="tr-block"><small>{k.slice(-2).toUpperCase()}</small>{res[k]}</div>)}
          {res.notes && <div className="alert warn">{res.notes}</div>}
          <button className="btn btn-primary" onClick={() => {
            const patch: Partial<Form> = {};
            keys.forEach((k) => { if (res[k]) (patch as any)[k] = String(res[k]); });
            onUse(patch, file);
          }}>{r.aiUse} →</button>
        </div>
      )}
    </div>
  );
}
