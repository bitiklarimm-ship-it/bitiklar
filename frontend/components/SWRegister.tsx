"use client";

import { useEffect } from "react";

/** Oflayn rejim uchun service worker'ni ro'yxatdan o'tkazish (faqat https va ishchi saytda). */
export default function SWRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;
    if (location.hostname === "localhost" || location.hostname === "127.0.0.1") return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
