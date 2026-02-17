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
  annualSponsorRevenue: number;
  avgCPM: number;
  impressionsPerEvent: number;
  eventsPerYear: number;
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
    description: "Primary center-hung display — highest visibility in-bowl",
    annualSponsorRevenue: 1200000,
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
    description: "200ft perimeter ribbon — north side, continuous scroll",
    annualSponsorRevenue: 450000,
    avgCPM: 22,
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
    description: "200ft perimeter ribbon — south side, continuous scroll",
    annualSponsorRevenue: 450000,
    avgCPM: 22,
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
    annualSponsorRevenue: 350000,
    avgCPM: 18,
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

// ── Venue Types ──────────────────────────────────────────────────────────────
export interface VenueType {
  id: string;
  name: string;
  capacity: string;
  courtColor: number;
  courtShape: "rect" | "oval";
  courtW: number;
  courtH: number;
  icon: string;
  description: string;
}

export const VENUE_TYPES: VenueType[] = [
  { id: "nba", name: "NBA Arena", capacity: "18,000", courtColor: 0x2a1f0a, courtShape: "rect", courtW: 16, courtH: 9, icon: "🏀", description: "Basketball arena with hardwood court" },
  { id: "nhl", name: "NHL Arena", capacity: "18,500", courtColor: 0xd0dce8, courtShape: "oval", courtW: 17, courtH: 8, icon: "🏒", description: "Hockey rink with ice surface" },
  { id: "nfl", name: "NFL Stadium", capacity: "70,000", courtColor: 0x1a3a1a, courtShape: "rect", courtW: 20, courtH: 10, icon: "🏈", description: "Football stadium with turf field" },
  { id: "concert", name: "Concert Hall", capacity: "12,000", courtColor: 0x0a0a0a, courtShape: "rect", courtW: 12, courtH: 8, icon: "🎤", description: "Multi-purpose entertainment venue" },
  { id: "mls", name: "MLS Stadium", capacity: "25,000", courtColor: 0x1a3a1a, courtShape: "rect", courtW: 22, courtH: 13, icon: "⚽", description: "Soccer stadium with natural pitch" },
];

// ── Scene Moods ──────────────────────────────────────────────────────────────
export interface SceneMood {
  id: string;
  name: string;
  description: string;
  ambientIntensity: number;
  spotIntensity: number;
  fogNear: number;
  fogFar: number;
  fogColor: number;
  exposure: number;
  screenGlow: number;
  accentColor: string;
}

export const SCENE_MOODS: SceneMood[] = [
  { id: "game-night", name: "Game Night", description: "Dark & dramatic — screens pop", ambientIntensity: 0.2, spotIntensity: 100, fogNear: 30, fogFar: 130, fogColor: 0x030812, exposure: 1.4, screenGlow: 3.5, accentColor: "#0A52EF" },
  { id: "concert", name: "Concert Mode", description: "Deep purple atmosphere", ambientIntensity: 0.1, spotIntensity: 120, fogNear: 20, fogFar: 100, fogColor: 0x0a0518, exposure: 1.6, screenGlow: 4.5, accentColor: "#9333EA" },
  { id: "corporate", name: "Corporate Event", description: "Bright & professional", ambientIntensity: 0.6, spotIntensity: 60, fogNear: 50, fogFar: 160, fogColor: 0x0c1020, exposure: 1.8, screenGlow: 2.0, accentColor: "#0A52EF" },
  { id: "bright", name: "Full Lights", description: "Maximum arena visibility", ambientIntensity: 1.0, spotIntensity: 40, fogNear: 60, fogFar: 200, fogColor: 0x101828, exposure: 2.2, screenGlow: 1.5, accentColor: "#FFFFFF" },
  { id: "blackout", name: "Blackout", description: "Screens only — maximum impact", ambientIntensity: 0.02, spotIntensity: 15, fogNear: 10, fogFar: 60, fogColor: 0x000005, exposure: 1.0, screenGlow: 5.0, accentColor: "#03B8FF" },
];
