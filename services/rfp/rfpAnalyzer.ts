/**
 * RFP Analyzer — Send pre-filtered PDF sections to AnythingLLM for structured extraction.
 *
 * Takes the high-value sections from pdfProcessor and gets AI analysis.
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { ANC_SYSTEM_PROMPT } from "@/lib/ai-prompts";
import type { ProcessedPdf, PdfSection } from "./pdfProcessor";

// ============================================================================
// TYPES
// ============================================================================

export interface RfpAnalysis {
  /** Structural overview (from pre-filter, no AI needed) */
  structure: {
    fileName: string;
    totalPages: number;
    totalSections: number;
    highValueSections: number;
    filteredOutPercent: number;
    sectionMap: Array<{
      heading: string;
      page: number;
      category: string;
      score: number;
    }>;
  };
  /** AI-generated structured extraction of high-value content */
  extraction: string;
  /** Raw sources from AnythingLLM */
  sources: any[];
}

// ============================================================================
// ANALYZER
// ============================================================================

const DASHBOARD_WORKSPACE_SLUG = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";

/**
 * Analyze a pre-processed PDF by sending high-value sections to AnythingLLM.
 *
 * If the high-value text is too large (>80K chars), it gets chunked and
 * analyzed in passes, then combined.
 */
export async function analyzeRfp(processed: ProcessedPdf): Promise<RfpAnalysis> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    throw new Error("AnythingLLM not configured. Set ANYTHING_LLM_URL and ANYTHING_LLM_KEY.");
  }

  // Build structural overview (free — no AI)
  const structure: RfpAnalysis["structure"] = {
    fileName: processed.fileName,
    totalPages: processed.totalPages,
    totalSections: processed.stats.totalSections,
    highValueSections: processed.stats.highValueCount,
    filteredOutPercent: processed.stats.filteredOutPercent,
    sectionMap: processed.sections.map(s => ({
      heading: s.heading,
      page: s.pageStart,
      category: s.category,
      score: s.relevanceScore,
    })),
  };

  // If no high-value content, return structure only
  if (processed.highValueSections.length === 0) {
    return {
      structure,
      extraction: "No high-value content detected in this document. It may be primarily legal/boilerplate content.",
      sources: [],
    };
  }

  // Chunk high-value text if it's too large for a single LLM call
  const MAX_CHARS_PER_CALL = 60000; // ~15K tokens, safe for most models
  const chunks = chunkText(processed.highValueText, MAX_CHARS_PER_CALL);

  console.log(`[RFP Analyzer] ${processed.fileName}: ${processed.stats.totalSections} sections, ${processed.stats.highValueCount} high-value, ${chunks.length} chunk(s) to analyze`);

  let fullExtraction = "";
  let allSources: any[] = [];

  if (chunks.length === 1) {
    // Single pass — full extraction
    const result = await callAnythingLLM(buildExtractionPrompt(chunks[0], processed.fileName));
    fullExtraction = result.text;
    allSources = result.sources;
  } else {
    // Multi-pass — extract from each chunk, then combine
    const chunkResults: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      console.log(`[RFP Analyzer] Processing chunk ${i + 1}/${chunks.length}...`);
      const prompt = buildChunkPrompt(chunks[i], i + 1, chunks.length, processed.fileName);
      const result = await callAnythingLLM(prompt);
      chunkResults.push(result.text);
      allSources.push(...result.sources);
    }

    // Combine pass
    console.log(`[RFP Analyzer] Combining ${chunkResults.length} chunk results...`);
    const combinePrompt = buildCombinePrompt(chunkResults, processed.fileName);
    const combined = await callAnythingLLM(combinePrompt);
    fullExtraction = combined.text;
    allSources.push(...combined.sources);
  }

  return {
    structure,
    extraction: fullExtraction,
    sources: allSources,
  };
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildExtractionPrompt(text: string, fileName: string): string {
  return `${ANC_SYSTEM_PROMPT}

You are analyzing an RFP document: "${fileName}"

The following is the HIGH-VALUE content extracted from the document (low-value sections like legal boilerplate, team bios, and disclaimers have been pre-filtered out).

Analyze this content and produce a structured brief that an ANC estimator can immediately work from.

OUTPUT FORMAT:

## DOCUMENT TYPE & OVERVIEW
- Document type (RFP, RFI, RFQ, Bid Invitation, etc.)
- Issuing organization
- Project name/description

## CLIENT & VENUE
- Client name
- Venue/location
- Project type (new install / replacement / upgrade / expansion)

## DISPLAY REQUIREMENTS
For each display/screen mentioned:
| # | Location | Dimensions | Pixel Pitch | Indoor/Outdoor | Qty | Special Notes |
|---|----------|-----------|-------------|----------------|-----|---------------|

## CRITICAL DEADLINES
- RFP response due
- Pre-bid meeting
- Notice to proceed
- Installation start
- Completion deadline

## SCOPE OF WORK
- What must be provided
- Key deliverables
- Exclusions mentioned
- Phasing approach

## PRICING STRUCTURE
- How pricing should be submitted
- Any specific forms or formats required
- Alternates requested

## FORMS & COMPLIANCE
| Form/Exhibit | Description | Required? |
|-------------|-------------|-----------|

## RED FLAGS & WATCH ITEMS
- Unusual requirements
- Tight timelines
- Special insurance/bonding
- Ambiguous specs that need clarification

## KEY NUMBERS
List every specific number, dollar amount, dimension, date, or quantity mentioned.

---

DOCUMENT CONTENT:

${text}`;
}

function buildChunkPrompt(text: string, chunkNum: number, totalChunks: number, fileName: string): string {
  return `You are analyzing part ${chunkNum} of ${totalChunks} from an RFP document: "${fileName}"

Extract ALL actionable information from this section. Focus on:
- Display specs (dimensions, pixel pitch, quantities, locations)
- Pricing requirements
- Deadlines and dates
- Scope items and deliverables
- Forms and compliance requirements
- Any specific numbers, dollar amounts, or quantities

Be thorough — this is one piece of a larger document and every detail matters.

CONTENT (Part ${chunkNum}/${totalChunks}):

${text}`;
}

function buildCombinePrompt(chunkResults: string[], fileName: string): string {
  const combined = chunkResults.map((r, i) => `--- PART ${i + 1} ---\n${r}`).join("\n\n");

  return `${ANC_SYSTEM_PROMPT}

You previously analyzed an RFP document ("${fileName}") in ${chunkResults.length} parts. Below are the extractions from each part.

Combine them into ONE unified, structured brief. Remove duplicates, resolve conflicts (later parts override earlier), and organize into this format:

## DOCUMENT TYPE & OVERVIEW
## CLIENT & VENUE
## DISPLAY REQUIREMENTS (table format)
## CRITICAL DEADLINES
## SCOPE OF WORK
## PRICING STRUCTURE
## FORMS & COMPLIANCE (table format)
## RED FLAGS & WATCH ITEMS
## KEY NUMBERS

---

EXTRACTED DATA FROM ALL PARTS:

${combined}`;
}

// ============================================================================
// ANYTHINGLLM CALL
// ============================================================================

async function callAnythingLLM(message: string): Promise<{ text: string; sources: any[] }> {
  const chatUrl = `${ANYTHING_LLM_BASE_URL}/workspace/${DASHBOARD_WORKSPACE_SLUG}/chat`;

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({
      message,
      mode: "chat",
      sessionId: `rfp-analyzer-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AnythingLLM error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    text: data.textResponse || data.response || "No response received.",
    sources: data.sources || [],
  };
}

// ============================================================================
// TEXT CHUNKING
// ============================================================================

function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];

  const chunks: string[] = [];
  const sections = text.split(/\n---\s/);

  let current = "";
  for (const section of sections) {
    if (current.length + section.length + 5 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = "";
    }
    current += (current ? "\n--- " : "") + section;
  }
  if (current.trim()) chunks.push(current.trim());

  // If any chunk is still too large, hard-split it
  const result: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      result.push(chunk);
    } else {
      for (let i = 0; i < chunk.length; i += maxChars) {
        result.push(chunk.slice(i, i + maxChars));
      }
    }
  }

  return result;
}
