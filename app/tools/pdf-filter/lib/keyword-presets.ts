export interface KeywordCategory {
  id: string;
  label: string;
  keywords: string[];
  /** Specificity weight: 3 = LED/AV-specific, 2 = relevant but shared, 1 = generic construction */
  weight: number;
}

export const KEYWORD_PRESETS: KeywordCategory[] = [
  {
    id: "display-hardware",
    label: "Display Hardware",
    weight: 3,
    keywords: [
      "LED display", "led display", "L.E.D.", "video board", "video display",
      "video wall", "scoreboard", "ribbon board", "ribbon display", "fascia board",
      "center hung", "centerhung", "auxiliary board", "auxiliary display",
      "marquee", "digital signage", "LED module", "LED cabinet", "LED tile",
      "display schedule", "11 06 60", "11 63 10",
    ],
  },
  {
    id: "display-specs",
    label: "Display Specs",
    weight: 3,
    keywords: [
      "pixel pitch", "SMD", "DIP", "nits", "candela",
      "viewing distance", "viewing angle", "refresh rate",
      "grayscale", "color temperature", "contrast ratio", "IP65",
      "IP54", "outdoor rated", "indoor rated",
    ],
  },
  {
    id: "electrical",
    label: "Electrical (LED-related)",
    weight: 1,
    keywords: [
      "power distribution", "power supply", "power requirements",
      "circuit breaker", "transformer", "UPS",
      "uninterruptible", "dedicated circuit",
      "panel board", "load calculation",
    ],
  },
  {
    id: "structural",
    label: "Structural (LED-related)",
    weight: 1,
    keywords: [
      "mounting", "rigging", "structural steel",
      "catenary", "dead load", "live load", "wind load",
      "seismic", "embed plate", "unistrut",
      "structural engineer", "PE stamp",
    ],
  },
  {
    id: "installation",
    label: "Installation",
    weight: 1,
    keywords: [
      "commissioning", "alignment", "leveling",
      "boom lift", "scissor lift", "crane",
      "cable tray", "wire pull", "termination",
    ],
  },
  {
    id: "control-data",
    label: "Control / Data",
    weight: 2,
    keywords: [
      "control system", "video processor", "scaler",
      "fiber optic", "HDMI", "DVI", "SDI",
      "redundancy", "failover", "media player",
    ],
  },
  {
    id: "permits",
    label: "Permits / Compliance",
    weight: 1,
    keywords: [
      "sign code", "stamped drawings",
      "shop drawings", "submittals",
    ],
  },
  {
    id: "commercial",
    label: "Commercial / Scope",
    weight: 2,
    keywords: [
      "scope of work", "SOW", "spec section",
      "base bid", "add alternate", "deduct alternate", "unit price",
      "allowance", "warranty", "service agreement",
      "Division 11", "division 11",
    ],
  },
];

export interface WeightedKeyword {
  keyword: string;
  weight: number;
}

export function getActiveKeywords(
  enabledCategories: Set<string>,
  customKeywords: string[]
): string[] {
  const presetKeywords = KEYWORD_PRESETS
    .filter((cat) => enabledCategories.has(cat.id))
    .flatMap((cat) => cat.keywords);

  return [...presetKeywords, ...customKeywords];
}

export function getWeightedKeywords(
  enabledCategories: Set<string>,
  customKeywords: string[]
): WeightedKeyword[] {
  const weighted: WeightedKeyword[] = [];

  for (const cat of KEYWORD_PRESETS) {
    if (!enabledCategories.has(cat.id)) continue;
    for (const kw of cat.keywords) {
      weighted.push({ keyword: kw, weight: cat.weight });
    }
  }

  // Custom keywords get weight 3 (user explicitly added them = high signal)
  for (const kw of customKeywords) {
    weighted.push({ keyword: kw, weight: 3 });
  }

  return weighted;
}
