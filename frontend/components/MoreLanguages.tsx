"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/client";
import { useDict } from "@/lib/useDict";

// O'z tilidagi nomlari bilan
const LANGS: [string, string][] = [
  ["tr", "Türkçe"], ["az", "Azərbaycanca"], ["kk", "Қазақша"], ["ky", "Кыргызча"], ["tk", "Türkmençe"],
  ["tg", "Тоҷикӣ"], ["fa", "فارسی"], ["ar", "العربية"], ["de", "Deutsch"], ["fr", "Français"], ["es", "Español"],
  ["it", "Italiano"], ["zh", "中文"], ["ja", "日本語"], ["ko", "한국어"], ["hi", "हिन्दी"],
];
const RTL = new Set(["ar", "fa"]);

/** Tarjimani boshqa tillarda o'qish (AI tarjima, keshlanadi). */
export default function MoreLanguages({ slug }: { slug: string }) {
  const d = useDict();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ title: string; translation: string; lang: string } | null>(null);
  const [err, setErr] = useState("");

  async function go(c: string) {
    setCode(c); setRes(null); setErr("");
    if (!c) return;
    setBusy(true);
    const r = await api("/ai/translate/", { method: "POST", body: JSON.stringify({ slug, target: c }) });
    setBusy(false);
    if (r.ok) setRes(await r.json());
    else setErr(r.status === 503 ? d.ai.off : r.status === 429 ? d.ai.limit : await errorText(r, d.research.error));
  }

  return (
    <div className="more-langs">
      <label className="chk">🌐 {d.moreLangs.label}
        <select className="input" style={{ width: "auto", minHeight: 36 }} value={code} onChange={(e) => go(e.target.value)} disabled={busy}>
          <option value="">—</option>
          {LANGS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </label>
      {busy && <div className="ai-thinking"><span /><span /><span /> {d.ai.thinking}</div>}
      {err && <div className="alert warn" style={{ marginTop: 8 }}>{err}</div>}
      {res && (
        <div className="tr-block current" lang={res.lang} dir={RTL.has(res.lang) ? "rtl" : undefined} style={{ marginTop: 10 }}>
          <small>{LANGS.find(([c]) => c === res.lang)?.[1]} · {d.moreLangs.aiNote}</small>
          {res.title && <b style={{ display: "block", marginBottom: 6 }}>{res.title}</b>}
          {res.translation}
        </div>
      )}
    </div>
  );
}
