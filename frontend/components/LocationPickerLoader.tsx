"use client";

import dynamic from "next/dynamic";

const LocationPickerLoader = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="map-mini" style={{ height: 320, background: "#e9e2d4" }} />,
});

export default LocationPickerLoader;
