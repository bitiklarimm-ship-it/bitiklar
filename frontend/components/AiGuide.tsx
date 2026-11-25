"use client";

import { useState } from "react";
import { api, errorText } from "@/lib/client";
import { useDict, useLang } from "@/lib/useDict";
import ReadAloud from "./ReadAloud";

type Mode = "simple" | "kids" | "scholar" | "qa";
type Turn = { role: "user" | "assistant"; content: string };

/** AI gid: bitikni tanlangan uslubda tushuntiradi yoki savollarga javob beradi. */
export default function AiGuide({ slug }: { slug: string }) {
  const d = useDict();
  const lang = useLang();
  const a = d.ai;
  const [mode, setMode] = useState<Mode>("simple");
  const [answers, setAnswers] = useState<Partial<Record<Mode, string>>>({});
  const [chat, setChat] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function ask(m: Mode, question = "") {
    setBusy(true); setErr("");
    const res = await api("/ai/explain/", {
      method: "POST",
      body: JSON.stringify({ slug, mode: m, lang, question, history: m === "qa" ? chat : [] }),
    });
    setBusy(false);
    if (!res.ok) {
      setErr(res.status === 503 ? a.off : res.status === 429 ? a.limit : await errorText(res, d.research.error));
      return;
    }
    const { answer } = await res.json();
    if (m === "qa") {
      setChat((c) => [...c, { role: "user", content: question }, { role: "assistant", content: answer }]);
      setQ("");
    } else {
      setAnswers((x) => ({ ...x, [m]: answer }));
    }
  }

  function choose(m: Mode) {
    setMode(m);
    setErr("");
    if (m !== "qa" && !answers[m]) ask(m);
  }

  const modes: { k: Mode; icon: string; label: string }[] = [
    { k: "simple", icon: "💬", label: a.simple },
    { k: "kids", icon: "🧒", label: a.kids },
    { k: "scholar", icon: "🎓", label: a.scholar },
    { k: "qa", icon: "❓", label: a.qa },
  ];
  const current = mode !== "qa" ? answers[mode] : undefined;

  return (
    <section className="card ai-guide block">
      <div className="ai-head">
        <span className="ai-badge">AI</span>
        <div>
          <h3 style={{ margin: 0 }}>{a.title}</h3>
          <p className="muted" style={{ margin: 0, fontSize: ".88rem" }}>{a.subtitle}</p>
        </div>
      </div>
      <div className="ai-modes" role="tablist">
        {modes.map((m) => (
          <button key={m.k} role="tab" aria-selected={mode === m.k} className={mode === m.k ? "active" : ""} onClick={() => choose(m.k)}>
            <span aria-hidden="true">{m.icon}</span> {m.label}
          </button>
        ))}
      </div>

      <div className="ai-body" aria-live="polite">
        {mode !== "qa" && !current && !busy && !err && (
          <button className="btn btn-dark" onClick={() => ask(mode)}>✨ {a.start}</button>
        )}
        {busy && mode !== "qa" && <div className="ai-thinking"><span /><span /><span /> {a.thinking}</div>}
        {current && (
          <>
            <div className="ai-answer">{current}</div>
            <ReadAloud text={current} lang={lang} labels={d.speech} />
          </>
        )}

        {mode === "qa" && (
          <>
            {!chat.length && (
              <div className="chips" style={{ marginBottom: 12 }}>
                {a.examples.map((ex) => (
                  <button key={ex} className="chip" onClick={() => ask("qa", ex)} disabled={busy}>{ex}</button>
                ))}
              </div>
            )}
            <div className="ai-chat">
              {chat.map((t, k) => (
                <div key={k} className={`ai-msg ${t.role}`}>{t.content}</div>
              ))}
              {busy && <div className="ai-thinking"><span /><span /><span /> {a.thinking}</div>}
            </div>
            <form className="ai-ask" onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask("qa", q.trim()); }}>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={a.placeholder} maxLength={600} disabled={busy} />
              <button className="btn btn-dark" type="submit" disabled={busy || !q.trim()}>➤</button>
            </form>
          </>
        )}
        {err && <div className="alert warn" style={{ marginTop: 12 }}>{err}</div>}
      </div>
      <p className="ai-note">{a.disclaimer}</p>
    </section>
  );
}
