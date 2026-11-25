"use client";

import { useState } from "react";
import { PUBLIC_API } from "@/lib/api";
import { useDict, useLang } from "@/lib/useDict";

/** Yo'nalishni (sahifalar, obidalar, bitiklar, rasmlar) internetsiz ko'rish uchun oldindan saqlash. */
export default function OfflineSave({ urls, apiPaths }: { urls: string[]; apiPaths: string[] }) {
  const d = useDict();
  const lang = useLang();
  const o = d.offline;
  const [state, setState] = useState<"idle" | "busy" | "done" | "unsupported">("idle");
  const [n, setN] = useState(0);

  async function save() {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) { setState("unsupported"); return; }
    setState("busy"); setN(0);
    const pages = new Set(urls);
    const images = new Set<string>();
    let count = 0;
    const get = async (u: string) => { try { const r = await fetch(u, { credentials: "same-origin" }); count++; setN(count); return r; } catch { return null; } };
    for (const p of apiPaths) {
      const r = await get(`${PUBLIC_API}/api${p}`);
      if (!r?.ok) continue;
      try {
        const j = await r.json();
        if (j.cover_url) images.add(j.cover_url);
        for (const it of j.inscriptions || []) {
          pages.add(`/${lang}/bitiklar/${it.slug}`);
          if (it.image_url) images.add(it.image_url);
        }
      } catch { /* */ }
    }
    for (const u of pages) await get(u);
    for (const u of images) { try { await fetch(u, { mode: "no-cors" }); count++; setN(count); } catch { /* */ } }
    setState("done");
  }

  return (
    <div className="offline-save">
      <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={save} disabled={state === "busy"}>
        {state === "busy" ? `⏳ ${o.saving} (${n})` : state === "done" ? `✓ ${o.saved}` : `⬇ ${o.save}`}
      </button>
      <small className="muted">{state === "unsupported" ? o.unsupported : state === "done" ? o.savedHint : o.hint}</small>
    </div>
  );
}
