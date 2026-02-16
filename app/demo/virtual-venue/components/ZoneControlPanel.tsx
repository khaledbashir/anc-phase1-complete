"use client";

import { Zap, RotateCcw } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ZoneToggleRow from "./ZoneToggleRow";
import PricingSummary from "./PricingSummary";
import type { VenueState } from "../hooks/useVenueState";

export default function ZoneControlPanel({ venueState }: { venueState: VenueState }) {
  const {
    zones,
    toggleZone,
    cascadeAll,
    activeZones,
    allActive,
    totalHardwareCost,
    totalSellPrice,
    getZoneSellPrice,
  } = venueState;

  return (
    <Card className="border border-border bg-card flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Display Packages</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Toggle zones for live pricing
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={cascadeAll}
            className="gap-1.5 text-xs"
          >
            {allActive ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5" />
                Light It Up
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto space-y-0.5 px-3">
        {zones.map((zone) => (
          <ZoneToggleRow
            key={zone.id}
            zone={zone}
            isActive={zone.isActive}
            sellPrice={getZoneSellPrice(zone)}
            onToggle={toggleZone}
          />
        ))}
      </CardContent>

      <CardFooter className="border-t border-border pt-4 px-5">
        <PricingSummary
          activeCount={activeZones.length}
          totalCount={zones.length}
          totalHardwareCost={totalHardwareCost}
          totalSellPrice={totalSellPrice}
        />
      </CardFooter>
    </Card>
  );
}
