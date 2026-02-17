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
  // Revenue projections (annual, based on typical NBA/NHL arena sponsorship rates)
  annualSponsorRevenue: number;
  avgCPM: number;
  impressionsPerEvent: number;
  eventsPerYear: number;
}

// Pricing from Yaham NX rate card (Feb 2026) — matches /api/admin/seed
// Revenue data from industry benchmarks (IEG, KORE Software, ANC internal)
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
    description: "Primary center-hung display — highest visibility in venue",
    annualSponsorRevenue: 850000,
    avgCPM: 45,
    impressionsPerEvent: 18000,
    eventsPerYear: 150,
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
    description: "200ft perimeter ribbon — constant sponsor rotation",
    annualSponsorRevenue: 420000,
    avgCPM: 28,
    impressionsPerEvent: 18000,
    eventsPerYear: 150,
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
    description: "200ft perimeter ribbon — broadcast camera side",
    annualSponsorRevenue: 520000,
    avgCPM: 32,
    impressionsPerEvent: 18000,
    eventsPerYear: 150,
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
    description: "Upper-deck balcony rail — visible from every seat",
    annualSponsorRevenue: 380000,
    avgCPM: 22,
    impressionsPerEvent: 18000,
    eventsPerYear: 150,
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
    description: "6 tunnel entrance displays — captive audience at entry/exit",
    annualSponsorRevenue: 180000,
    avgCPM: 18,
    impressionsPerEvent: 18000,
    eventsPerYear: 150,
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
    description: "4 high-res concourse wall displays — food/merch/wayfinding",
    annualSponsorRevenue: 240000,
    avgCPM: 35,
    impressionsPerEvent: 18000,
    eventsPerYear: 150,
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
    description: "Exterior entrance — first and last thing fans see",
    annualSponsorRevenue: 320000,
    avgCPM: 15,
    impressionsPerEvent: 35000,
    eventsPerYear: 150,
  },
];

// Services overhead ratio (structure + install + electrical + PM + eng + shipping)
// Based on typical ratio from EstimatorBridge.ts calculations
export const SERVICES_MULTIPLIER = 0.45;

// Default proposal margin
export const DEFAULT_MARGIN = 0.30;

// ── Package Presets ──────────────────────────────────────────────────────────
export interface PackagePreset {
  id: string;
  name: string;
  description: string;
  zoneIds: string[];
  badge: string;
  color: string;
}

export const PACKAGE_PRESETS: PackagePreset[] = [
  {
    id: "essential",
    name: "Essential",
    description: "Scoreboard + ribbon — covers the basics",
    zoneIds: ["scoreboard", "ribbon-north", "ribbon-south"],
    badge: "GOOD",
    color: "#3B82F6",
  },
  {
    id: "premium",
    name: "Premium",
    description: "Essential + fascia + courtside vomitory signs",
    zoneIds: ["scoreboard", "ribbon-north", "ribbon-south", "fascia", "vomitory"],
    badge: "BETTER",
    color: "#8B5CF6",
  },
  {
    id: "flagship",
    name: "Flagship",
    description: "Every screen zone — maximum revenue, maximum impact",
    zoneIds: ["scoreboard", "ribbon-north", "ribbon-south", "fascia", "vomitory", "concourse", "marquee"],
    badge: "BEST",
    color: "#10B981",
  },
];

// ── Camera Presets ───────────────────────────────────────────────────────────
export interface CameraPreset {
  id: string;
  label: string;
  description: string;
  pos: [number, number, number];
  target: [number, number, number];
  autoRotate: boolean;
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: "overview", label: "Arena Overview", description: "Full venue flyover", pos: [22, 16, 28], target: [0, 6, 0], autoRotate: true },
  { id: "fan-upper", label: "Fan POV (Upper)", description: "Upper bowl seat view", pos: [25, 14, 18], target: [0, 8, 0], autoRotate: false },
  { id: "fan-lower", label: "Fan POV (Lower)", description: "Lower bowl seat view", pos: [16, 6, 14], target: [0, 6, 0], autoRotate: false },
  { id: "broadcast", label: "Broadcast View", description: "TV camera angle — ribbon in shot", pos: [0, 10, 28], target: [0, 8, 0], autoRotate: false },
  { id: "suite", label: "Suite Level", description: "Premium suite perspective", pos: [18, 16, 8], target: [0, 12, 0], autoRotate: false },
  { id: "courtside", label: "Courtside", description: "Floor-level — courtside boards", pos: [8, 3, 16], target: [0, 0.6, 0], autoRotate: false },
  { id: "scoreboard", label: "Center Hung", description: "Main scoreboard close-up", pos: [0, 12, 18], target: [0, 14, 0], autoRotate: false },
  { id: "entrance", label: "Venue Entrance", description: "Marquee and exterior signage", pos: [0, 8, 50], target: [0, 6, 38], autoRotate: false },
];
