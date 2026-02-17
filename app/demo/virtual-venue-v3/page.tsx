"use client";

import dynamic from "next/dynamic";

const PhotoVenueViewer = dynamic(
  () => import("./components/PhotoVenueViewer"),
  { ssr: false }
);

export default function VirtualVenueV3Page() {
  return <PhotoVenueViewer />;
}
