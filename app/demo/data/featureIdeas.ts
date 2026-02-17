import {
  Building2,
  TrendingUp,
  Shield,
  FileSearch,
  Globe,
  Activity,
  Brain,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DemoFeature {
  id: string;
  title: string;
  description: string;
  benefit: string;
  status: "concept" | "development" | "live";
  icon: LucideIcon;
  demoHref?: string;
  accentColor: string;
  seedVotes: { up: number; down: number };
}

export const FEATURE_IDEAS: DemoFeature[] = [
  {
    id: "virtual-venue",
    title: "Virtual Venue Visualizer",
    description:
      "Toggle LED displays and drag sponsor logos onto screens — live pricing, instant mock-ups. The stadium sells itself.",
    benefit: "Upsell machine + sponsor commitment tool. Clients see the vision, sponsors commit before the deal is signed.",
    status: "live",
    icon: Building2,
    demoHref: "/demo/virtual-venue",
    accentColor: "#0A52EF",
    seedVotes: { up: 14, down: 0 },
  },
  {
    id: "roi-calculator",
    title: "ROI Calculator",
    description:
      "Input attendance, events, CPM — instantly shows how fast the screen pays for itself from ad revenue alone.",
    benefit: "Overcomes the 'too expensive' objection. The math sells it for you.",
    status: "live",
    icon: TrendingUp,
    demoHref: "/demo/roi-calculator",
    accentColor: "#10B981",
    seedVotes: { up: 11, down: 1 },
  },
  {
    id: "multi-vendor-compare",
    title: "Multi-Vendor Option Compare",
    description:
      "One button duplicates the current display with a different product. Side-by-side Yaham vs LG vs Absen pricing.",
    benefit: "Creates 2-3 option proposals in 10 minutes instead of 2 hours.",
    status: "development",
    icon: Shield,
    accentColor: "#8B5CF6",
    seedVotes: { up: 8, down: 2 },
  },
  {
    id: "auto-rfp-response",
    title: "Auto-RFP Response",
    description:
      "AI reads the RFP, extracts every screen requirement, and pre-fills the estimator with matching products.",
    benefit: "Saves 20-40 hours per RFP response.",
    status: "development",
    icon: FileSearch,
    accentColor: "#EC4899",
    seedVotes: { up: 7, down: 1 },
  },
  {
    id: "client-portal-v2",
    title: "Client Decision Portal",
    description:
      "Clients approve proposals, leave comments, and track status — all from a branded share page.",
    benefit: "Every interaction keeps them in ANC's ecosystem. Not Daktronics'. Not Samsung's.",
    status: "concept",
    icon: Globe,
    accentColor: "#06B6D4",
    seedVotes: { up: 6, down: 0 },
  },
  {
    id: "predictive-maintenance",
    title: "Predictive Maintenance",
    description:
      "Screen uptime monitoring with alerts before failure. Prevents catastrophic game-day outages.",
    benefit: "Turns maintenance from reactive to proactive. Premium upsell for every install.",
    status: "concept",
    icon: Activity,
    accentColor: "#EF4444",
    seedVotes: { up: 4, down: 3 },
  },
  {
    id: "ai-negotiation",
    title: "AI Negotiation Coach",
    description:
      "Before a pricing call, AI analyzes the deal and suggests negotiation strategies based on margin room and competitive intel.",
    benefit: "Jireh walks into every call with a game plan.",
    status: "concept",
    icon: Brain,
    accentColor: "#0385DD",
    seedVotes: { up: 5, down: 2 },
  },
];
