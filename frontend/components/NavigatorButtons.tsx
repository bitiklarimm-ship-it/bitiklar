"use client";

import { useEffect, useState } from "react";
import { navApps, platform, type NavApp } from "@/lib/navigators";

/** Navigator ilovalari tugmalari (qurilmaga mos tartibda). */
export default function NavigatorButtons({ lat, lng, name, compact = false }: { lat: number; lng: number; name: string; compact?: boolean }) {
  const [apps, setApps] = useState<NavApp[]>(() => navApps(lat, lng, name).filter((a) => !a.mobileOnly && !a.androidOnly));

  // Platformaga qarab: telefonda Yandex Navigator, Android'da "boshqa ilova", iPhone'da Apple birinchi
  useEffect(() => {
    const p = platform();
    let list = navApps(lat, lng, name).filter((a) => (!a.mobileOnly || p.mobile) && (!a.androidOnly || p.android));
    if (p.ios) list = [...list.filter((a) => a.key === "apple"), ...list.filter((a) => a.key !== "apple")];
    setApps(list);
  }, [lat, lng, name]);

  return (
    <div className={`nav-apps ${compact ? "compact" : ""}`}>
      {apps.map((a) => (
        <a key={a.key} href={a.url} target={a.url.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="nav-app">
          <span className="nav-app-ic" style={{ background: a.color, color: a.key === "yandexnavi" ? "#000" : "#fff" }} aria-hidden="true">
            {a.letter}
          </span>
          <span>{a.name}</span>
        </a>
      ))}
    </div>
  );
}
