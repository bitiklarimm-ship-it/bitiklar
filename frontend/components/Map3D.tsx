"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { STYLE_3D_CITY, TERRAIN_TILES, TILES } from "@/lib/tiles";

type Mode = "satellite" | "city";
type Labels = { satellite: string; city: string; rotate: string; stop: string; hint: string };

/** Sun'iy yo'ldosh tasviri + relyef (tog'lar, tepaliklar) — kalitsiz manbalar. */
function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      sat: { type: "raster", tiles: [TILES.satellite.url], tileSize: 256, maxzoom: 19, attribution: "© Esri, Maxar, Earthstar Geographics" },
      labels: { type: "raster", tiles: [TILES.labels.url], tileSize: 256, maxzoom: 19 },
      dem: { type: "raster-dem", tiles: [TERRAIN_TILES], encoding: "terrarium", tileSize: 256, maxzoom: 15, attribution: "Relyef: Mapzen / AWS Terrain Tiles" },
    },
    layers: [
      { id: "sat", type: "raster", source: "sat" },
      { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.9 } },
    ],
    terrain: { source: "dem", exaggeration: 1.3 },
  };
}

export default function Map3D({ lat, lng, title, labels }: { lat: number; lng: number; title: string; labels: Labels }) {
  const box = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const rotating = useRef(false);
  const [mode, setMode] = useState<Mode>("satellite");
  const [spin, setSpin] = useState(false);

  useEffect(() => {
    if (!box.current) return;
    const map = new maplibregl.Map({
      container: box.current,
      style: mode === "satellite" ? satelliteStyle() : STYLE_3D_CITY,
      center: [lng, lat],
      zoom: 17.2,
      pitch: 62,
      bearing: -25,
      maxPitch: 85,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    new maplibregl.Marker({ color: "#d6aa5c" })
      .setLngLat([lng, lat])
      .setPopup(new maplibregl.Popup({ offset: 24 }).setText(title))
      .addTo(map);
    return () => { rotating.current = false; map.remove(); mapRef.current = null; };
  }, [lat, lng, title, mode]);

  // Obida atrofida sekin aylanish
  useEffect(() => {
    const map = mapRef.current;
    rotating.current = spin;
    if (!map || !spin) return;
    const step = () => {
      if (!rotating.current || !mapRef.current) return;
      mapRef.current.rotateTo((mapRef.current.getBearing() + 30) % 360, { duration: 4000, easing: (t) => t });
      mapRef.current.once("moveend", step);
    };
    step();
    return () => { rotating.current = false; };
  }, [spin, mode]);

  return (
    <div className="map3d">
      <div className="map3d-bar">
        <div className="seg" style={{ margin: 0 }}>
          <button className={mode === "satellite" ? "active" : ""} onClick={() => setMode("satellite")}>🛰 {labels.satellite}</button>
          <button className={mode === "city" ? "active" : ""} onClick={() => setMode("city")}>🏙 {labels.city}</button>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => setSpin(!spin)}>{spin ? `■ ${labels.stop}` : `⟳ ${labels.rotate}`}</button>
        <span className="muted map3d-hint">{labels.hint}</span>
      </div>
      <div ref={box} className="map3d-canvas" />
    </div>
  );
}
