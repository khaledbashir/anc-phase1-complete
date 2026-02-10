/**
 * PDF Processor — Extract text from PDFs and split into scored sections.
 *
 * Pipeline: PDF buffer → raw text → section chunks → relevance-scored chunks
 * No AI involved — pure text processing and keyword heuristics.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PdfSection {
  /** Section index (0-based) */
  index: number;
  /** Detected heading / section title */
  heading: string;
  /** Raw text content */
  text: string;
  /** Approximate page number (1-based) */
  pageStart: number;
  /** Character count */
  charCount: number;
  /** Word count */
  wordCount: number;
  /** Relevance category */
  category: SectionCategory;
  /** Relevance score 1-10 */
  relevanceScore: number;
  /** If score <= 3, why it can be skipped */
  skipReason: string | null;
}

export type SectionCategory =
  | "PRICING"
  | "DISPLAY_SPECS"
  | "SCOPE"
  | "SCHEDULE"
  | "REQUIREMENTS"
  | "WARRANTY"
  | "SOFTWARE"
  | "TEAM"
  | "CASE_STUDY"
  | "LEGAL"
  | "BOILERPLATE"
  | "UNKNOWN";

export interface ProcessedPdf {
  /** Original filename */
  fileName: string;
  /** Total pages (estimated from text) */
  totalPages: number;
  /** Total character count */
  totalChars: number;
  /** All sections with scores */
  sections: PdfSection[];
  /** High-value sections only (score >= 5) */
  highValueSections: PdfSection[];
  /** Combined text of high-value sections (what gets sent to AI) */
  highValueText: string;
  /** Stats */
  stats: {
    totalSections: number;
    highValueCount: number;
    mediumValueCount: number;
    lowValueCount: number;
    filteredOutPercent: number;
    estimatedTokensSaved: number;
  };
}

// ============================================================================
// KEYWORD DICTIONARIES
// ============================================================================

const CATEGORY_KEYWORDS: Record<SectionCategory, RegExp[]> = {
  PRICING: [
    /\bpric(e|ing|ed)\b/i, /\bcost\b/i, /\btotal\b/i, /\bbudget\b/i,
    /\bbid\b/i, /\bquot(e|ation)\b/i, /\bfee\b/i, /\brate\b/i,
    /\bcompensation\b/i, /\ballowance\b/i, /\bestimate\b/i,
    /\bline\s*item/i, /\bunit\s*price/i, /\blump\s*sum/i,
    /\balternate\b/i, /\badd\s*on/i, /\bdeduct/i,
  ],
  DISPLAY_SPECS: [
    /\bpixel\s*pitch\b/i, /\bresolution\b/i, /\bnit[s]?\b/i,
    /\bbrightness\b/i, /\bled\b/i, /\blcd\b/i, /\bdisplay\b/i,
    /\bscreen\b/i, /\bvideo\s*(wall|board)\b/i, /\bscoreboard\b/i,
    /\bribbon\s*board\b/i, /\bfascia\b/i, /\bmarquee\b/i,
    /\bdimension/i, /\bsq(uare)?\s*f(ee)?t\b/i, /\bfoot\b.*\bwide\b/i,
    /\bpower\s*consumption/i, /\bweight\b/i, /\bcabinet\b/i,
    /\bmodule\b/i, /\brefresh\s*rate/i, /\bviewing\s*(angle|distance)/i,
  ],
  SCOPE: [
    /\bscope\s*(of\s*work)?\b/i, /\binstall(ation)?\b/i,
    /\bdemolition\b/i, /\bremov(e|al)\b/i, /\bphase\b/i,
    /\bmobiliz(e|ation)\b/i, /\bcommission/i, /\bintegrat/i,
    /\bsubcontract/i, /\bresponsib(le|ility)\b/i, /\bexclusion/i,
    /\bassumption/i, /\bdeliverable/i, /\bwork\s*plan/i,
    /\bgeneral\s*condition/i, /\bsite\s*prep/i,
  ],
  SCHEDULE: [
    /\bschedule\b/i, /\btimeline\b/i, /\bmilestone\b/i,
    /\bdeadline\b/i, /\bcompletion\s*date/i, /\bnotice\s*to\s*proceed/i,
    /\bntp\b/i, /\bsubstantial\s*completion/i, /\bduration\b/i,
    /\bcalendar\s*day/i, /\bwork(ing)?\s*day/i, /\bgantt\b/i,
    /\bcritical\s*path/i, /\bliquidated\s*damage/i,
  ],
  REQUIREMENTS: [
    /\brequirement/i, /\bqualification/i, /\bcertific(ate|ation)/i,
    /\bcompliance\b/i, /\bstandard\b/i, /\bcode\b/i,
    /\bpermit\b/i, /\binspection\b/i, /\bsubmittal/i,
    /\bform\b/i, /\bexhibit\b/i, /\battachment\b/i,
    /\bappendix\b/i, /\baddendum\b/i, /\bspecification/i,
    /\bminority\b/i, /\bmwbe\b/i, /\bdbe\b/i, /\bunion\b/i,
    /\bprevailing\s*wage/i, /\bdavis.bacon/i,
  ],
  WARRANTY: [
    /\bwarranty\b/i, /\bwarranties\b/i, /\bguarantee\b/i,
    /\bmaintenance\b/i, /\bservice\s*level/i, /\bsla\b/i,
    /\bresponse\s*time/i, /\bspare\s*part/i, /\bpreventative/i,
    /\bpreventive/i, /\bannual\s*check/i, /\bsupport\b/i,
  ],
  SOFTWARE: [
    /\bcms\b/i, /\bcontent\s*management/i, /\blivesync\b/i,
    /\bsoftware\b/i, /\bcontrol\s*system/i, /\bprocessor\b/i,
    /\bmedia\s*player/i, /\bnovastar\b/i, /\bcolorlight\b/i,
    /\bbrightwall\b/i, /\bscaling\b/i, /\bnetwork/i,
  ],
  TEAM: [
    /\bteam\b/i, /\bpersonnel\b/i, /\bstaff(ing)?\b/i,
    /\bproject\s*manager\b/i, /\bresume\b/i, /\bbio(graphy)?\b/i,
    /\bexperience\b/i, /\bkey\s*person/i, /\borganiz(ation)?\s*chart/i,
  ],
  CASE_STUDY: [
    /\bcase\s*stud/i, /\breference\b/i, /\bpast\s*(project|performance)/i,
    /\bportfolio\b/i, /\bsimilar\s*project/i, /\btrack\s*record/i,
  ],
  LEGAL: [
    /\bindemnif/i, /\bliabilit/i, /\binsurance\b/i,
    /\bbond(ing)?\b/i, /\bcontract\b/i, /\bterms?\s*(and|&)\s*condition/i,
    /\bdispute\b/i, /\barbitration\b/i, /\bgoverning\s*law/i,
    /\bjurisdiction\b/i, /\btermination\b/i, /\bforce\s*majeure/i,
    /\bconfidential/i, /\bnon.disclosure/i, /\bnda\b/i,
  ],
  BOILERPLATE: [
    /\bequal\s*opportunity/i, /\baffirmative\s*action/i,
    /\bdata\s*privacy/i, /\bcookie\b/i, /\bgdpr\b/i,
    /\bdisclaimer\b/i, /\bcopyright\b/i, /\btrademark\b/i,
    /\ball\s*rights\s*reserved/i, /\bno\s*part\s*of\s*this/i,
    /\bthis\s*document\s*is\s*confidential/i,
    /\bprohibited\s*without/i,
  ],
  UNKNOWN: [],
};

// Boost keywords — if these appear, bump the score
const HIGH_VALUE_BOOSTERS = [
  /\$[\d,]+/,                    // Dollar amounts
  /\d+['′]\s*[hHxX×]\s*\d+/,   // Dimensions like 12' x 10'
  /\d+\s*mm\b/i,                // Pixel pitch
  /\d+\s*nit/i,                 // Brightness
  /\d+\s*sq/i,                  // Square footage
  /\bled\b.*\bdisplay\b/i,      // LED display
  /\bphase\s*\d/i,              // Phase numbers
  /\byear\s*\d/i,               // Year numbers
];

// ============================================================================
// MAIN PROCESSOR
// ============================================================================

export async function processPdf(
  buffer: Buffer,
  fileName: string = "document.pdf"
): Promise<ProcessedPdf> {
  // unpdf: works in Node.js serverless (no web worker needed)
  const { extractText } = await import("unpdf");

  const result = await extractText(new Uint8Array(buffer));
  const rawText = typeof result.text === "string" ? result.text : (result.text || []).join("\n\n");
  const totalPages = result.totalPages || Math.ceil(rawText.length / 3000);

  // Split into sections
  const sections = splitIntoSections(rawText, totalPages);

  // Score each section
  const scoredSections = sections.map((section, idx) => scoreSection(section, idx));

  // Filter
  const highValue = scoredSections.filter(s => s.relevanceScore >= 5);
  const medium = scoredSections.filter(s => s.relevanceScore >= 4 && s.relevanceScore < 5);
  const low = scoredSections.filter(s => s.relevanceScore < 4);

  const highValueText = highValue
    .map(s => `--- ${s.heading} (Score: ${s.relevanceScore}/10, Category: ${s.category}) ---\n${s.text}`)
    .join("\n\n");

  const totalChars = rawText.length;
  const filteredChars = low.reduce((sum, s) => sum + s.charCount, 0);

  return {
    fileName,
    totalPages,
    totalChars,
    sections: scoredSections,
    highValueSections: highValue,
    highValueText,
    stats: {
      totalSections: scoredSections.length,
      highValueCount: highValue.length,
      mediumValueCount: medium.length,
      lowValueCount: low.length,
      filteredOutPercent: totalChars > 0 ? Math.round((filteredChars / totalChars) * 100) : 0,
      estimatedTokensSaved: Math.round(filteredChars / 4), // ~4 chars per token
    },
  };
}

// ============================================================================
// SECTION SPLITTING
// ============================================================================

/**
 * Split raw PDF text into logical sections based on heading patterns.
 * Handles: numbered sections (1.0, 1.1), UPPERCASE HEADINGS, page breaks.
 */
function splitIntoSections(
  text: string,
  totalPages: number
): Omit<PdfSection, "category" | "relevanceScore" | "skipReason">[] {
  const lines = text.split("\n");
  const sections: Omit<PdfSection, "category" | "relevanceScore" | "skipReason">[] = [];

  // Heading patterns
  const headingPatterns = [
    /^(?:SECTION|ARTICLE|PART|CHAPTER|DIVISION)\s+[\dIVXA-Z]/i,
    /^\d{1,2}(?:\.\d{1,2}){0,3}\s+[A-Z]/,       // 1.0 HEADING, 2.1.3 HEADING
    /^[A-Z][A-Z\s&\-/]{8,}$/,                     // ALL CAPS HEADING (min 8 chars)
    /^(?:EXHIBIT|APPENDIX|ATTACHMENT|ADDENDUM)\s/i,
    /^(?:SCOPE OF WORK|GENERAL CONDITIONS|SPECIAL CONDITIONS|TECHNICAL SPECIFICATIONS)/i,
    /^(?:BID FORM|PROPOSAL FORM|PRICING SCHEDULE|FEE SCHEDULE)/i,
    /^(?:TABLE OF CONTENTS|INTRODUCTION|OVERVIEW|BACKGROUND|PURPOSE)/i,
    /^(?:EVALUATION CRITERIA|SELECTION CRITERIA|SCORING)/i,
    /^(?:INSURANCE|BONDING|WARRANTY|SCHEDULE|TIMELINE)/i,
  ];

  let currentHeading = "Document Start";
  let currentLines: string[] = [];
  let currentPageStart = 1;
  let charsSoFar = 0;
  const charsPerPage = text.length / Math.max(totalPages, 1);

  const flushSection = () => {
    const sectionText = currentLines.join("\n").trim();
    if (sectionText.length > 50) { // Skip tiny fragments
      const wordCount = sectionText.split(/\s+/).length;
      sections.push({
        index: sections.length,
        heading: currentHeading,
        text: sectionText,
        pageStart: currentPageStart,
        charCount: sectionText.length,
        wordCount,
      });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    charsSoFar += line.length + 1;

    // Check if this line is a heading
    const isHeading = trimmed.length > 3 &&
      trimmed.length < 200 &&
      headingPatterns.some(p => p.test(trimmed));

    if (isHeading) {
      flushSection();
      currentHeading = trimmed;
      currentLines = [];
      currentPageStart = Math.max(1, Math.ceil(charsSoFar / charsPerPage));
    } else {
      currentLines.push(line);
    }
  }

  // Flush last section
  flushSection();

  // If we got very few sections, fall back to page-based chunking
  if (sections.length < 3 && text.length > 5000) {
    return chunkBySize(text, totalPages);
  }

  return sections;
}

/**
 * Fallback: chunk text into ~3000 char blocks when heading detection fails.
 */
function chunkBySize(
  text: string,
  totalPages: number
): Omit<PdfSection, "category" | "relevanceScore" | "skipReason">[] {
  const CHUNK_SIZE = 3000;
  const sections: Omit<PdfSection, "category" | "relevanceScore" | "skipReason">[] = [];
  const charsPerPage = text.length / Math.max(totalPages, 1);

  for (let i = 0; i < text.length; i += CHUNK_SIZE) {
    const chunk = text.slice(i, i + CHUNK_SIZE);
    const wordCount = chunk.split(/\s+/).length;
    const pageStart = Math.max(1, Math.ceil(i / charsPerPage));

    // Try to find a heading in the first 2 lines
    const firstLines = chunk.split("\n").slice(0, 3).join(" ").trim();
    const heading = firstLines.length > 5 && firstLines.length < 100
      ? firstLines.slice(0, 80)
      : `Page ~${pageStart}`;

    sections.push({
      index: sections.length,
      heading,
      text: chunk,
      pageStart,
      charCount: chunk.length,
      wordCount,
    });
  }

  return sections;
}

// ============================================================================
// RELEVANCE SCORING
// ============================================================================

function scoreSection(
  section: Omit<PdfSection, "category" | "relevanceScore" | "skipReason">,
  _idx: number
): PdfSection {
  const text = section.text;
  const textLower = text.toLowerCase();

  // Count keyword matches per category
  const categoryScores: Record<SectionCategory, number> = {} as any;
  let bestCategory: SectionCategory = "UNKNOWN";
  let bestCategoryScore = 0;

  for (const [cat, patterns] of Object.entries(CATEGORY_KEYWORDS) as [SectionCategory, RegExp[]][]) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = text.match(new RegExp(pattern.source, "gi"));
      if (matches) score += matches.length;
    }
    categoryScores[cat] = score;
    if (score > bestCategoryScore) {
      bestCategoryScore = score;
      bestCategory = cat;
    }
  }

  // Base relevance score from category
  const categoryRelevanceMap: Record<SectionCategory, number> = {
    PRICING: 10,
    DISPLAY_SPECS: 10,
    SCOPE: 9,
    SCHEDULE: 8,
    REQUIREMENTS: 7,
    WARRANTY: 7,
    SOFTWARE: 7,
    TEAM: 3,
    CASE_STUDY: 4,
    LEGAL: 2,
    BOILERPLATE: 1,
    UNKNOWN: 5,
  };

  let relevanceScore = categoryRelevanceMap[bestCategory];

  // Boost for high-value indicators
  let boostCount = 0;
  for (const booster of HIGH_VALUE_BOOSTERS) {
    if (booster.test(text)) boostCount++;
  }
  if (boostCount >= 3) relevanceScore = Math.min(10, relevanceScore + 2);
  else if (boostCount >= 1) relevanceScore = Math.min(10, relevanceScore + 1);

  // Penalize very short sections (likely headers or page numbers)
  if (section.wordCount < 20) relevanceScore = Math.max(1, relevanceScore - 3);

  // Penalize sections that are mostly numbers/symbols (tables of contents, indexes)
  const alphaRatio = (text.match(/[a-zA-Z]/g) || []).length / Math.max(text.length, 1);
  if (alphaRatio < 0.3) relevanceScore = Math.max(1, relevanceScore - 2);

  // Clamp
  relevanceScore = Math.max(1, Math.min(10, relevanceScore));

  // Skip reason
  let skipReason: string | null = null;
  if (relevanceScore <= 3) {
    if (bestCategory === "LEGAL") skipReason = "Legal boilerplate — no actionable data for ANC";
    else if (bestCategory === "BOILERPLATE") skipReason = "Generic boilerplate — marketing or disclaimers";
    else if (bestCategory === "TEAM") skipReason = "Team bios — not relevant to pricing or specs";
    else if (section.wordCount < 20) skipReason = "Too short — likely a header or page fragment";
    else skipReason = "Low relevance — no pricing, specs, scope, or schedule data detected";
  }

  return {
    ...section,
    category: bestCategory,
    relevanceScore,
    skipReason,
  };
}
