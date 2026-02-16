"use client";

import { useVenueState } from "./hooks/useVenueState";
import VenueHeader from "./components/VenueHeader";
import StadiumSvg from "./components/StadiumSvg";
import ZoneControlPanel from "./components/ZoneControlPanel";
import SponsorLocker from "./components/SponsorLocker";

export default function VirtualVenuePage() {
  const venueState = useVenueState();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <VenueHeader />

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: Stadium SVG */}
          <div className="lg:col-span-3 space-y-4">
            <StadiumSvg zones={venueState.zones} onToggle={venueState.toggleZone} />

            {/* Sponsor locker below the SVG */}
            <SponsorLocker activeZones={venueState.activeZones} />
          </div>

          {/* Right: Control Panel */}
          <div className="lg:col-span-2">
            <div className="sticky top-6">
              <ZoneControlPanel venueState={venueState} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
