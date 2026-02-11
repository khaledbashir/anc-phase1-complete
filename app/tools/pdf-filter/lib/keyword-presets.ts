export interface KeywordCategory {
  id: string;
  label: string;
  keywords: string[];
}

export const KEYWORD_PRESETS: KeywordCategory[] = [
  {
    id: "display-hardware",
    label: "Display Hardware",
    keywords: [
      "LED", "L.E.D.", "led display", "LED display", "video board", "video display",
      "video wall", "scoreboard", "ribbon board", "ribbon display", "fascia",
      "fascia board", "center hung", "centerhung", "auxiliary board", "auxiliary display",
      "marquee", "digital signage", "display panel", "display module", "LED module",
      "LED cabinet", "LED tile",
    ],
  },
  {
    id: "display-specs",
    label: "Display Specs",
    keywords: [
      "pixel pitch", "SMD", "DIP", "brightness", "nits", "candela",
      "viewing distance", "viewing angle", "refresh rate", "resolution",
      "grayscale", "color temperature", "contrast ratio", "IP rating", "IP65",
      "IP54", "weatherproof", "outdoor rated", "indoor rated",
    ],
  },
  {
    id: "electrical",
    label: "Electrical",
    keywords: [
      "electrical", "power distribution", "power supply", "power requirements",
      "voltage", "amperage", "wattage", "circuit breaker", "transformer", "UPS",
      "uninterruptible", "generator", "conduit", "junction box", "disconnect",
      "NEC", "electrical code", "branch circuit", "dedicated circuit",
      "service entrance", "panel board", "load calculation",
    ],
  },
  {
    id: "structural",
    label: "Structural",
    keywords: [
      "mounting", "rigging", "structural", "structural steel", "steel", "I-beam",
      "W-beam", "catenary", "guy wire", "dead load", "live load", "wind load",
      "seismic", "anchor", "concrete anchor", "embed plate", "unistrut", "bracket",
      "cleat", "hanger", "truss", "canopy", "overhang", "elevation",
      "structural engineer", "PE stamp",
    ],
  },
  {
    id: "installation",
    label: "Installation",
    keywords: [
      "installation", "install", "labor", "crew", "lift", "crane", "boom lift",
      "scissor lift", "scaffolding", "conduit run", "cable tray", "wire pull",
      "termination", "commissioning", "testing", "alignment", "leveling",
    ],
  },
  {
    id: "control-data",
    label: "Control / Data",
    keywords: [
      "control system", "controller", "processor", "video processor", "scaler",
      "fiber", "fiber optic", "data cable", "Cat6", "Cat5", "HDMI", "DVI", "SDI",
      "signal", "redundancy", "failover", "network", "switch", "media player",
    ],
  },
  {
    id: "permits",
    label: "Permits / Compliance",
    keywords: [
      "permit", "permits", "sign code", "building code", "zoning", "variance",
      "ADA", "egress", "fire code", "fire marshal", "inspection",
      "stamped drawings", "PE", "professional engineer", "shop drawings", "submittals",
    ],
  },
  {
    id: "commercial",
    label: "Commercial / Pricing",
    keywords: [
      "pricing", "bid", "proposal", "quote", "RFP", "RFQ", "scope of work", "SOW",
      "specification", "spec", "spec section", "division", "CSI", "alternates",
      "alternate", "base bid", "add alternate", "deduct alternate", "unit price",
      "allowance", "contingency", "warranty", "maintenance", "service agreement",
    ],
  },
];

export function getActiveKeywords(
  enabledCategories: Set<string>,
  customKeywords: string[]
): string[] {
  const presetKeywords = KEYWORD_PRESETS
    .filter((cat) => enabledCategories.has(cat.id))
    .flatMap((cat) => cat.keywords);

  return [...presetKeywords, ...customKeywords];
}
