"use client";

import { PUBLIC_API } from "./api";

const KEY = "bitiklar_tokens";

type Tokens = { access: string; refresh: string };

export function getTokens(): Tokens | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTokens(t: Tokens | null) {
  try {
    if (t) localStorage.setItem(KEY, JSON.stringify(t));
    else localStorage.removeItem(KEY);
  } catch {
    /* brauzer xotirasi yopiq bo'lishi mumkin */
  }
}

async function refresh(): Promise<string | null> {
  const t = getTokens();
  if (!t) return null;
  const r = await fetch(`${PUBLIC_API}/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: t.refresh }),
  });
  if (!r.ok) {
    setTokens(null);
    return null;
  }
  const j = await r.json();
  setTokens({ access: j.access, refresh: j.refresh || t.refresh });
  return j.access;
}

/** Avtorizatsiyali so'rov; access eskirsa refresh qilib qayta urinadi. */
export async function api(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const t = getTokens();
  const headers = new Headers(init.headers);
  if (t) headers.set("Authorization", `Bearer ${t.access}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const res = await fetch(`${PUBLIC_API}/api${path}`, { ...init, headers });
  if (res.status === 401 && retry && t) {
    const a = await refresh();
    if (a) return api(path, init, false);
  }
  return res;
}

export async function errorText(res: Response, fallback: string): Promise<string> {
  try {
    const j = await res.json();
    if (typeof j === "string") return j;
    if (j.detail) return j.detail;
    return Object.entries(j).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : JSON.stringify(v)}`).join("; ");
  } catch {
    return fallback;
  }
}
