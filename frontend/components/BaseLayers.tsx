"use client";

import { LayerGroup, LayersControl, TileLayer } from "react-leaflet";
import { MAX_ZOOM, TILES, type TileDef } from "@/lib/tiles";

function Tile({ t, opacity }: { t: TileDef; opacity?: number }) {
  return (
    <TileLayer
      url={t.url}
      attribution={t.attribution}
      maxNativeZoom={t.maxNativeZoom}
      maxZoom={MAX_ZOOM}
      subdomains={t.subdomains || "abc"}
      opacity={opacity}
      detectRetina
    />
  );
}

export type BaseKind = "hybrid" | "satellite" | "street" | "topo";

/** Barcha xaritalar uchun umumiy qatlamlar tanlovi (o'ng yuqori burchakda). */
export default function BaseLayers({ labels, initial = "hybrid", dark = false }: {
  labels: { hybrid: string; satellite: string; street: string; topo: string };
  initial?: BaseKind;
  dark?: boolean;
}) {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked={initial === "hybrid"} name={labels.hybrid}>
        <LayerGroup>
          <Tile t={TILES.satellite} />
          <Tile t={TILES.roads} opacity={0.7} />
          <Tile t={TILES.labels} />
        </LayerGroup>
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={initial === "satellite"} name={labels.satellite}>
        <Tile t={TILES.satellite} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={initial === "street"} name={labels.street}>
        <Tile t={dark ? TILES.dark : TILES.street} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={initial === "topo"} name={labels.topo}>
        <Tile t={TILES.topo} />
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
