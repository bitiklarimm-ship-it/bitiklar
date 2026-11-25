"use client";

import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

/** Xarita joylashgan blok o'lchami o'zgarsa (tab, sidebar, ekran burilishi) — xaritani qayta chizadi.
 *  Busiz xaritada kulrang bo'sh joylar qoladi. */
export function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const el = map.getContainer();
    if (!("ResizeObserver" in window)) return;
    let t: ReturnType<typeof setTimeout>;
    const ro = new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => map.invalidateSize({ pan: false }), 120); });
    ro.observe(el);
    return () => { clearTimeout(t); ro.disconnect(); };
  }, [map]);
  return null;
}

/** Butun ekran tugmasi — haqiqiy Leaflet boshqaruvi (bosish xaritaga o'tmaydi). */
export function FullscreenControl({ label }: { label: string }) {
  const map = useMap();
  useEffect(() => {
    const wrap = map.getContainer().parentElement || map.getContainer();
    const Ctl = L.Control.extend({
      onAdd() {
        const box = L.DomUtil.create("div", "leaflet-bar leaflet-control");
        const a = L.DomUtil.create("a", "fs-btn", box) as HTMLAnchorElement;
        a.href = "#";
        a.title = label;
        a.setAttribute("role", "button");
        a.setAttribute("aria-label", label);
        a.textContent = "⤢";
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.on(a, "click", (e) => {
          L.DomEvent.preventDefault(e);
          const on = wrap.classList.contains("map-fs") || document.fullscreenElement === wrap;
          if (on) {
            if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
            wrap.classList.remove("map-fs");
            a.textContent = "⤢";
          } else {
            // iPhone'da Fullscreen API yo'q — CSS bilan butun ekranga yoyamiz
            if (wrap.requestFullscreen) wrap.requestFullscreen().catch(() => wrap.classList.add("map-fs"));
            else wrap.classList.add("map-fs");
            a.textContent = "⤡";
          }
          setTimeout(() => map.invalidateSize(), 250);
        });
        return box;
      },
    });
    const ctl = new Ctl({ position: "topleft" });
    ctl.addTo(map);
    const onFs = () => {
      if (!document.fullscreenElement) wrap.classList.remove("map-fs");
      setTimeout(() => map.invalidateSize(), 200);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => { ctl.remove(); document.removeEventListener("fullscreenchange", onFs); };
  }, [map, label]);
  return null;
}

/** Kichik xaritalar uchun: telefonda bir barmoq bilan sahifa aylanadi, xarita esa ikki barmoq bilan suriladi. */
export function CooperativeGestures({ hint }: { hint: string }) {
  const map = useMap();
  useEffect(() => {
    if (!L.Browser.mobile) return;
    map.dragging.disable();
    map.scrollWheelZoom.disable();
    const el = map.getContainer();
    let shown: ReturnType<typeof setTimeout> | undefined;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length >= 2) { map.dragging.enable(); el.classList.remove("show-hint"); }
      else {
        map.dragging.disable();
        el.dataset.hint = hint;
        el.classList.add("show-hint");
        clearTimeout(shown);
        shown = setTimeout(() => el.classList.remove("show-hint"), 1200);
      }
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    return () => { el.removeEventListener("touchstart", onStart); clearTimeout(shown); };
  }, [map, hint]);
  return null;
}
