"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { VENUE_ZONES, SERVICES_MULTIPLIER, DEFAULT_MARGIN } from "../data/venueZones";
import type { VenueZone } from "../data/venueZones";

export interface ZoneState extends VenueZone {
  isActive: boolean;
}

export interface VenueState {
  zones: ZoneState[];
  toggleZone: (id: string) => void;
  toggleAll: () => void;
  cascadeAll: () => void;
  activeZones: ZoneState[];
  totalHardwareCost: number;
  totalProjectCost: number;
  totalSellPrice: number;
  allActive: boolean;
  noneActive: boolean;
  getZoneSellPrice: (zone: VenueZone) => number;
  getZoneHardwareCost: (zone: VenueZone) => number;
}

function calcHardwareCost(zone: VenueZone): number {
  return zone.defaultWidthFt * zone.defaultHeightFt * zone.costPerSqFt * zone.quantity;
}

function calcSellPrice(hardwareCost: number): number {
  const totalCost = hardwareCost * (1 + SERVICES_MULTIPLIER);
  return totalCost / (1 - DEFAULT_MARGIN);
}

export function useVenueState(): VenueState {
  const [activeMap, setActiveMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    VENUE_ZONES.forEach((z) => {
      map[z.id] = false;
    });
    return map;
  });

  const cascadeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const zones: ZoneState[] = useMemo(
    () => VENUE_ZONES.map((z) => ({ ...z, isActive: activeMap[z.id] ?? false })),
    [activeMap]
  );

  const activeZones = useMemo(() => zones.filter((z) => z.isActive), [zones]);
  const allActive = activeZones.length === zones.length;
  const noneActive = activeZones.length === 0;

  const totalHardwareCost = useMemo(
    () => activeZones.reduce((sum, z) => sum + calcHardwareCost(z), 0),
    [activeZones]
  );

  const totalProjectCost = useMemo(
    () => totalHardwareCost * (1 + SERVICES_MULTIPLIER),
    [totalHardwareCost]
  );

  const totalSellPrice = useMemo(
    () => (totalProjectCost > 0 ? totalProjectCost / (1 - DEFAULT_MARGIN) : 0),
    [totalProjectCost]
  );

  const toggleZone = useCallback((id: string) => {
    setActiveMap((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleAll = useCallback(() => {
    setActiveMap((prev) => {
      const allOn = VENUE_ZONES.every((z) => prev[z.id]);
      const map: Record<string, boolean> = {};
      VENUE_ZONES.forEach((z) => {
        map[z.id] = !allOn;
      });
      return map;
    });
  }, []);

  // Cascade activation: outside → in, 100ms stagger
  const CASCADE_ORDER = ["marquee", "vomitory", "concourse", "ribbon-north", "ribbon-south", "fascia", "scoreboard"];

  const cascadeAll = useCallback(() => {
    // Clear previous cascade
    cascadeTimers.current.forEach(clearTimeout);
    cascadeTimers.current = [];

    const allOn = VENUE_ZONES.every((z) => activeMap[z.id]);

    if (allOn) {
      // Turn all off instantly
      setActiveMap(() => {
        const map: Record<string, boolean> = {};
        VENUE_ZONES.forEach((z) => {
          map[z.id] = false;
        });
        return map;
      });
      return;
    }

    // Cascade on
    CASCADE_ORDER.forEach((id, i) => {
      const timer = setTimeout(() => {
        setActiveMap((prev) => ({ ...prev, [id]: true }));
      }, i * 120);
      cascadeTimers.current.push(timer);
    });
  }, [activeMap]);

  const getZoneHardwareCost = useCallback((zone: VenueZone) => calcHardwareCost(zone), []);
  const getZoneSellPrice = useCallback((zone: VenueZone) => calcSellPrice(calcHardwareCost(zone)), []);

  return {
    zones,
    toggleZone,
    toggleAll,
    cascadeAll,
    activeZones,
    totalHardwareCost,
    totalProjectCost,
    totalSellPrice,
    allActive,
    noneActive,
    getZoneSellPrice,
    getZoneHardwareCost,
  };
}
