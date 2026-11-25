"use client";

import { LayerGroup, LayersControl, TileLayer } from "react-leaflet";
import { MAX_ZOOM, TILES, type TileDef } from "@/lib/tiles";

function Tile({ t }: { t: TileDef }) {
  return (
    <TileLayer
      url={t.url}
      attribution={t.attribution}
      maxNativeZoom={t.maxNativeZoom}
      maxZoom={MAX_ZOOM}
      subdomains={t.subdomains || "abc"}
      className={t.className}
      keepBuffer={4}
      updateWhenZooming={false}
    />
  );
}

export type BaseKind = "street" | "satellite" | "hybrid";

/** Barcha xaritalar uchun qatlam tanlovi: Xarita · Sun'iy yo'ldosh · Sun'iy yo'ldosh + nomlar. */
export default function BaseLayers({ labels, initial = "street" }: {
  labels: { street: string; satellite: string; hybrid: string };
  initial?: BaseKind;
}) {
  return (
    <LayersControl position="topright">
      <LayersControl.BaseLayer checked={initial === "street"} name={labels.street}>
        <Tile t={TILES.street} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={initial === "satellite"} name={labels.satellite}>
        <Tile t={TILES.satellite} />
      </LayersControl.BaseLayer>
      <LayersControl.BaseLayer checked={initial === "hybrid"} name={labels.hybrid}>
        <LayerGroup>
          <Tile t={TILES.satellite} />
          <Tile t={TILES.labels} />
        </LayerGroup>
      </LayersControl.BaseLayer>
    </LayersControl>
  );
}
