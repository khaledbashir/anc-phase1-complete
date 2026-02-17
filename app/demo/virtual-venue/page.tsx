"use client";

import dynamic from "next/dynamic";

// Three.js must be loaded client-side only (no SSR)
const VenueCanvas = dynamic(
  () => import("./components/three/VenueCanvas"),
  { ssr: false }
);

export default function VirtualVenuePage() {
  return <VenueCanvas />;
}
