"use client";

import { useEffect, useRef, useState } from "react";

const BCP: Record<string, string[]> = {
  uz: ["uz-UZ", "uz"],
  ru: ["ru-RU", "ru"],
  en: ["en-GB", "en-US", "en"],
  ar: ["ar-SA", "ar"],
  fa: ["fa-IR", "fa"],
};

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  for (const code of BCP[lang] || [lang]) {
    const v = voices.find((x) => x.lang.toLowerCase().startsWith(code.toLowerCase()));
    if (v) return v;
  }
  return null;
}

/** Matnni ovoz chiqarib o'qish (brauzerning o'z ovozi bilan — internet va AI xarajatisiz). */
export default function ReadAloud({ text, lang, labels }: {
  text: string; lang: string; labels: { play: string; pause: string; stop: string; noVoice: string };
}) {
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [rate, setRate] = useState(1);
  const [supported, setSupported] = useState(true);
  const [noVoice, setNoVoice] = useState(false);
  const utt = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setSupported(false); return; }
    const check = () => setNoVoice(!pickVoice(lang));
    check();
    window.speechSynthesis.addEventListener?.("voiceschanged", check);
    return () => {
      window.speechSynthesis.removeEventListener?.("voiceschanged", check);
      window.speechSynthesis.cancel();
    };
  }, [lang]);

  if (!supported || !text) return null;

  function play() {
    const s = window.speechSynthesis;
    if (state === "paused") { s.resume(); setState("playing"); return; }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.lang = v?.lang || (BCP[lang] || [lang])[0];
    u.rate = rate;
    u.onend = () => setState("idle");
    u.onerror = () => setState("idle");
    utt.current = u;
    s.speak(u);
    setState("playing");
  }

  return (
    <div className="read-aloud">
      {state !== "playing" ? (
        <button className="btn btn-outline btn-sm" onClick={play}>🔊 {labels.play}</button>
      ) : (
        <button className="btn btn-outline btn-sm" onClick={() => { window.speechSynthesis.pause(); setState("paused"); }}>⏸ {labels.pause}</button>
      )}
      {state !== "idle" && (
        <button className="btn btn-outline btn-sm" onClick={() => { window.speechSynthesis.cancel(); setState("idle"); }}>■ {labels.stop}</button>
      )}
      <select className="input rate" value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Tezlik">
        {[0.75, 1, 1.25, 1.5].map((r) => <option key={r} value={r}>{r}×</option>)}
      </select>
      {noVoice && <small className="muted">{labels.noVoice}</small>}
    </div>
  );
}
