"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type LiveMapType from "./LiveMap";

// Leaflet va geolokatsiya faqat brauzerda ishlaydi
const LiveMap = dynamic(() => import("./LiveMap"), {
  ssr: false,
  loading: () => <div className="map-wrap" style={{ background: "#e9e2d4" }} />,
});

export default function LiveMapLoader(props: ComponentProps<typeof LiveMapType>) {
  return <LiveMap {...props} />;
}
