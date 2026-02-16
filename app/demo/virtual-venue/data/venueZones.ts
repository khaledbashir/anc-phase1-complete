import {
  Monitor,
  LayoutList,
  RectangleHorizontal,
  DoorOpen,
  MonitorPlay,
  Landmark,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface VenueZone {
  id: string;
  name: string;
  displayType: string;
  defaultWidthFt: number;
  defaultHeightFt: number;
  quantity: number;
  pixelPitch: string;
  environment: "indoor" | "outdoor";
  costPerSqFt: number;
  icon: LucideIcon;
  description: string;
}

// Pricing from Yaham NX rate card (Feb 2026) — matches /api/admin/seed
export const VENUE_ZONES: VenueZone[] = [
  {
    id: "scoreboard",
    name: "Center-Hung Scoreboard",
    displayType: "Main Scoreboard",
    defaultWidthFt: 25,
    defaultHeightFt: 15,
    quantity: 1,
    pixelPitch: "4mm",
    environment: "indoor",
    costPerSqFt: 178.09, // Yaham Corona C4
    icon: Monitor,
    description: "Primary center-hung display",
  },
  {
    id: "ribbon-north",
    name: "Ribbon Board (North)",
    displayType: "Ribbon Board",
    defaultWidthFt: 200,
    defaultHeightFt: 3,
    quantity: 1,
    pixelPitch: "10mm",
    environment: "indoor",
    costPerSqFt: 112.22, // Yaham Corona C10
    icon: LayoutList,
    description: "200ft perimeter ribbon — north side",
  },
  {
    id: "ribbon-south",
    name: "Ribbon Board (South)",
    displayType: "Ribbon Board",
    defaultWidthFt: 200,
    defaultHeightFt: 3,
    quantity: 1,
    pixelPitch: "10mm",
    environment: "indoor",
    costPerSqFt: 112.22, // Yaham Corona C10
    icon: LayoutList,
    description: "200ft perimeter ribbon — south side",
  },
  {
    id: "fascia",
    name: "Fascia Boards",
    displayType: "Fascia Board",
    defaultWidthFt: 300,
    defaultHeightFt: 2,
    quantity: 1,
    pixelPitch: "10mm",
    environment: "indoor",
    costPerSqFt: 116.25, // Yaham Halo H10T Fascia
    icon: RectangleHorizontal,
    description: "Upper-deck balcony rail displays",
  },
  {
    id: "vomitory",
    name: "Vomitory Signs",
    displayType: "Vomitory",
    defaultWidthFt: 6,
    defaultHeightFt: 3,
    quantity: 6,
    pixelPitch: "6mm",
    environment: "indoor",
    costPerSqFt: 136.51, // Yaham Corona C6
    icon: DoorOpen,
    description: "6 tunnel entrance displays",
  },
  {
    id: "concourse",
    name: "Concourse Displays",
    displayType: "Concourse",
    defaultWidthFt: 10,
    defaultHeightFt: 6,
    quantity: 4,
    pixelPitch: "2.5mm",
    environment: "indoor",
    costPerSqFt: 251.57, // Yaham Corona C2.5-MIP
    icon: MonitorPlay,
    description: "4 high-res concourse wall displays",
  },
  {
    id: "marquee",
    name: "Marquee / Entrance Sign",
    displayType: "Marquee",
    defaultWidthFt: 30,
    defaultHeightFt: 10,
    quantity: 1,
    pixelPitch: "10mm",
    environment: "outdoor",
    costPerSqFt: 154.79, // Yaham Radiance R10 Outdoor
    icon: Landmark,
    description: "Exterior entrance display",
  },
];

// Services overhead ratio (structure + install + electrical + PM + eng + shipping)
// Based on typical ratio from EstimatorBridge.ts calculations
export const SERVICES_MULTIPLIER = 0.45;

// Default proposal margin
export const DEFAULT_MARGIN = 0.30;
