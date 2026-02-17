"use client";

import dynamic from "next/dynamic";

const VenueCanvasV2 = dynamic(
  () => import("./components/VenueCanvasV2"),
  { ssr: false }
);

export default function VirtualVenueV2Page() {
  return <VenueCanvasV2 />;
}
