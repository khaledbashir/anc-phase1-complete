/**
 * Page Classifier
 *
 * Classifies Mistral OCR pages into categories and scores relevance.
 * Key insight: if Mistral returns very little markdown for a page,
 * it's likely a drawing/diagram → flag for Gemini vision.
 */

import type { MistralOcrPage } from "./mistralOcrClient";
import type { PageCategory, AnalyzedPage } from "./types";

// ---------------------------------------------------------------------------
// Drawing detection threshold
// ---------------------------------------------------------------------------

/**
 * If Mistral OCR returns less than this many characters of markdown,
 * the page is likely a drawing/diagram (images, not text).
 * Mistral OCR IS a vision model — if it can't extract meaningful text,
 * the page is visual-dominant.
 */
const DRAWING_TEXT_THRESHOLD = 150;

/**
 * If Mistral returns markdown but it's mostly short labels/annotations
 * (common in architectural drawings), also flag as drawing.
 */
const DRAWING_LINE_RATIO_THRESHOLD = 0.7; // >70% lines under 20 chars = drawing

// ---------------------------------------------------------------------------
// Keyword banks for classification
// ---------------------------------------------------------------------------

const LED_KEYWORDS = [
  "led", "display", "videoboard", "video board", "ribbon", "fascia",
  "scoreboard", "pixel pitch", "pixel-pitch", "nits", "brightness",
  "resolution", "cabinet", "module", "11 06 60", "11 63 10",
  "display schedule", "screen", "marquee", "ticker", "banner display",
  "dvled", "direct view", "smd", "dip", "viewing distance",
  "refresh rate", "processing", "novastar", "colorlight", "brompton",
];

const COST_KEYWORDS = [
  "cost schedule", "bid form", "unit price", "total price", "lump sum",
  "line item", "base bid", "alternate", "allowance", "exhibit b",
  "pricing", "budget", "not to exceed", "nte",
];

const SCOPE_KEYWORDS = [
  "scope of work", "sow", "project description", "work includes",
  "contractor shall", "shall provide", "general requirements",
  "exhibit a", "division 01", "project overview",
];

const TECHNICAL_KEYWORDS = [
  "structural", "electrical", "power", "conduit", "rigging",
  "tonnage", "load", "amperage", "voltage", "circuit", "panel",
  "hvac", "mechanical", "fire alarm", "egress",
];

const LEGAL_KEYWORDS = [
  "insurance", "indemnif", "liability", "warranty", "bond",
  "liquidated damages", "termination", "dispute", "arbitration",
  "compliance", "osha", "prevailing wage", "union",
  "terms and conditions", "general conditions",
];

const SCHEDULE_KEYWORDS = [
  "milestone", "substantial completion", "final completion",
  "notice to proceed", "ntp", "gantt", "critical path",
  "phase 1", "phase 2", "schedule of values",
];

const BOILERPLATE_KEYWORDS = [
  "table of contents", "appendix", "certification", "biography",
  "company profile", "qualifications", "references", "cover page",
  "addendum", "amendment", "revision history",
];

// ---------------------------------------------------------------------------
// Classify a single page
// ---------------------------------------------------------------------------

export function classifyPage(
  page: MistralOcrPage,
  pageNumber: number,
): AnalyzedPage {
  const text = page.markdown.toLowerCase();
  const textLength = page.markdown.trim().length;
  const hasTables = page.tables.length > 0;
  const hasImages = page.images.length > 0;

  // --- Drawing detection ---
  const isLikelyDrawing = detectDrawing(page);

  if (isLikelyDrawing) {
    return {
      index: page.index,
      pageNumber,
      category: "drawing",
      relevance: 60, // moderate by default, Gemini will refine
      markdown: page.markdown,
      tables: page.tables,
      visionAnalyzed: false,
      summary: textLength < 30
        ? "Drawing/diagram (no readable text)"
        : `Drawing/diagram: ${page.markdown.trim().slice(0, 100)}`,
      classifiedBy: "text-heuristic",
    };
  }

  // --- Keyword scoring ---
  const scores: Record<PageCategory, number> = {
    led_specs: scoreKeywords(text, LED_KEYWORDS, hasTables ? 1.5 : 1),
    cost_schedule: scoreKeywords(text, COST_KEYWORDS, hasTables ? 1.5 : 1),
    scope_of_work: scoreKeywords(text, SCOPE_KEYWORDS, 1),
    technical: scoreKeywords(text, TECHNICAL_KEYWORDS, 1),
    legal: scoreKeywords(text, LEGAL_KEYWORDS, 1),
    schedule: scoreKeywords(text, SCHEDULE_KEYWORDS, 1),
    boilerplate: scoreKeywords(text, BOILERPLATE_KEYWORDS, 1),
    drawing: 0,
    unknown: 0,
  };

  // Find winning category
  let bestCategory: PageCategory = "unknown";
  let bestScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestCategory = cat as PageCategory;
    }
  }

  // If no keywords matched at all
  if (bestScore === 0) {
    bestCategory = textLength < 100 ? "boilerplate" : "unknown";
  }

  // Relevance to LED extraction (0-100)
  const relevance = computeRelevance(bestCategory, scores);

  // Generate summary
  const summary = generateSummary(page, bestCategory, textLength);

  return {
    index: page.index,
    pageNumber,
    category: bestCategory,
    relevance,
    markdown: page.markdown,
    tables: page.tables,
    visionAnalyzed: false,
    summary,
    classifiedBy: "text-heuristic",
  };
}

// ---------------------------------------------------------------------------
// Drawing detection
// ---------------------------------------------------------------------------

function detectDrawing(page: MistralOcrPage): boolean {
  const text = page.markdown.trim();
  const textLength = text.length;

  // Very little text = likely a drawing
  if (textLength < DRAWING_TEXT_THRESHOLD) {
    return true;
  }

  // Check line ratio: drawings have many short annotation-like lines
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length > 3) {
    const shortLines = lines.filter((l) => l.trim().length < 20).length;
    const ratio = shortLines / lines.length;
    if (ratio > DRAWING_LINE_RATIO_THRESHOLD && textLength < 500) {
      return true;
    }
  }

  // Has images detected by Mistral and very little structured text
  if (page.images.length > 0 && textLength < 300 && page.tables.length === 0) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Keyword scoring
// ---------------------------------------------------------------------------

function scoreKeywords(
  text: string,
  keywords: string[],
  multiplier: number,
): number {
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) {
      score += multiplier;
    }
  }
  return score;
}

// ---------------------------------------------------------------------------
// Relevance scoring (how important is this page for LED extraction?)
// ---------------------------------------------------------------------------

function computeRelevance(
  category: PageCategory,
  scores: Record<PageCategory, number>,
): number {
  // Base relevance by category
  const baseRelevance: Record<PageCategory, number> = {
    led_specs: 95,
    drawing: 60,
    cost_schedule: 70,
    scope_of_work: 65,
    technical: 50,
    schedule: 40,
    legal: 10,
    boilerplate: 5,
    unknown: 20,
  };

  let relevance = baseRelevance[category] || 20;

  // Boost if LED keywords appear regardless of primary category
  if (scores.led_specs > 0 && category !== "led_specs") {
    relevance = Math.min(100, relevance + scores.led_specs * 10);
  }

  return Math.round(relevance);
}

// ---------------------------------------------------------------------------
// Summary generation
// ---------------------------------------------------------------------------

function generateSummary(
  page: MistralOcrPage,
  category: PageCategory,
  textLength: number,
): string {
  const labels: Record<PageCategory, string> = {
    led_specs: "LED display specifications",
    drawing: "Architectural/engineering drawing",
    cost_schedule: "Cost schedule / bid form",
    scope_of_work: "Scope of work",
    technical: "Technical specifications",
    legal: "Legal / contractual terms",
    boilerplate: "Boilerplate / administrative",
    schedule: "Project schedule / timeline",
    unknown: "Unclassified content",
  };

  const label = labels[category];
  const tables = page.tables.length > 0 ? ` (${page.tables.length} table${page.tables.length > 1 ? "s" : ""})` : "";

  // Get first meaningful line of text
  const firstLine = page.markdown
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 10);

  if (firstLine) {
    return `${label}${tables}: ${firstLine.slice(0, 120)}`;
  }

  return `${label}${tables}`;
}

// ---------------------------------------------------------------------------
// Batch classify all pages
// ---------------------------------------------------------------------------

export function classifyAllPages(
  pages: MistralOcrPage[],
): AnalyzedPage[] {
  return pages.map((page, i) => classifyPage(page, i + 1));
}

/**
 * Get pages that need Gemini vision analysis.
 * These are drawing pages OR pages with high relevance but low text content.
 */
export function getPagesNeedingVision(pages: AnalyzedPage[]): AnalyzedPage[] {
  return pages.filter(
    (p) =>
      p.category === "drawing" ||
      // High relevance but suspiciously short text — might have visual content
      (p.relevance > 50 && p.markdown.trim().length < 300),
  );
}
