"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./MapView";

// Leaflet faqat brauzerda ishlaydi
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <div className="map-wrap" style={{ background: "#e9e2d4" }} />,
});

export default function MapLoader(props: { points: MapPoint[]; zoom?: number; className?: string; line?: boolean }) {
  return <MapView {...props} />;
}
