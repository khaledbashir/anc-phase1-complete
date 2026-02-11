export interface DrawingCategory {
  id: string;
  label: string;
  description: string;
  enabledByDefault: boolean;
}

export const DRAWING_CATEGORIES: DrawingCategory[] = [
  {
    id: "electrical",
    label: "Electrical plans / power distribution",
    description: "Electrical one-lines, panel schedules, power distribution, branch circuits",
    enabledByDefault: true,
  },
  {
    id: "structural",
    label: "Structural / mounting / rigging details",
    description: "Steel framing, mounting brackets, embed plates, rigging points, structural connections",
    enabledByDefault: true,
  },
  {
    id: "signage",
    label: "Signage / display / scoreboard locations",
    description: "LED display placement, scoreboard locations, ribbon board routing, signage elevations",
    enabledByDefault: true,
  },
  {
    id: "conduit_routing",
    label: "Conduit / cable routing",
    description: "Conduit runs, cable tray layouts, junction box locations, wire routing",
    enabledByDefault: true,
  },
  {
    id: "elevation",
    label: "Elevations showing display placement",
    description: "Building elevations, section cuts showing display mounting heights and clearances",
    enabledByDefault: true,
  },
  {
    id: "site_plan",
    label: "Site plans / venue layout",
    description: "Overall venue layout, site plans, floor plans showing display locations",
    enabledByDefault: true,
  },
  {
    id: "mechanical",
    label: "Mechanical / HVAC",
    description: "HVAC ductwork, mechanical equipment, air handling — usually not relevant",
    enabledByDefault: false,
  },
  {
    id: "plumbing",
    label: "Plumbing",
    description: "Plumbing risers, domestic water, sanitary — usually not relevant",
    enabledByDefault: false,
  },
  {
    id: "civil",
    label: "Civil / site work",
    description: "Grading, paving, utilities, stormwater — usually not relevant",
    enabledByDefault: false,
  },
];

export const ALL_VISION_CATEGORY_IDS = DRAWING_CATEGORIES.map((c) => c.id);

export const VISION_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  DRAWING_CATEGORIES.map((c) => [c.id, c.label.split(" / ")[0]])
);

export function getDefaultEnabledDrawingCategories(): Set<string> {
  return new Set(DRAWING_CATEGORIES.filter((c) => c.enabledByDefault).map((c) => c.id));
}
