/**
 * Maps estimator DisplayAnswers → 3D venue zone IDs.
 *
 * Estimator locationType → 3D zone:
 *   "scoreboard"   → "scoreboard"
 *   "ribbon"        → "ribbon-north" then "ribbon-south"
 *   "fascia"        → "fascia"
 *   "wall"          → "concourse"
 *   "outdoor"       → "marquee"
 *   "freestanding"  → "vomitory"
 */

import type { DisplayAnswers } from "@/app/components/estimator/questions";

const LOCATION_TO_ZONES: Record<string, string[]> = {
  scoreboard: ["scoreboard"],
  ribbon: ["ribbon-north", "ribbon-south"],
  fascia: ["fascia"],
  wall: ["concourse"],
  outdoor: ["marquee"],
  freestanding: ["vomitory"],
};

export interface ZoneMapping {
  zoneId: string;
  displayIndex: number;
  displayName: string;
  locationType: string;
  widthFt: number;
  heightFt: number;
  pixelPitch: string;
}

/**
 * Convert estimator displays to zone mappings.
 * Each display maps to one 3D zone based on its locationType.
 * For ribbons, first maps to ribbon-north, second to ribbon-south.
 */
export function mapDisplaysToZones(displays: DisplayAnswers[]): ZoneMapping[] {
  const mappings: ZoneMapping[] = [];
  const usedZones = new Set<string>();

  for (let i = 0; i < displays.length; i++) {
    const d = displays[i];
    const loc = d.locationType || "wall";
    const candidates = LOCATION_TO_ZONES[loc] || ["concourse"];

    // Pick first unused zone for this location type, fall back to first candidate
    const zoneId = candidates.find((id) => !usedZones.has(id)) || candidates[0];
    usedZones.add(zoneId);

    mappings.push({
      zoneId,
      displayIndex: i,
      displayName: d.displayName || d.displayType || `Display ${i + 1}`,
      widthFt: d.widthFt || 10,
      heightFt: d.heightFt || 6,
      pixelPitch: d.pixelPitch || "4",
    });
  }

  return mappings;
}

/** Get Set of active zone IDs from estimator displays */
export function getActiveZoneIds(displays: DisplayAnswers[]): Set<string> {
  return new Set(mapDisplaysToZones(displays).map((m) => m.zoneId));
}
