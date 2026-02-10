/**
 * Pricing Section Mapper — P49b
 *
 * Detects distinct pricing sections in RFP/bid documents and maps them
 * to structured data. Identifies section names, estimated totals, line item
 * counts, tax/bond presence, and associated alternates.
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { ANC_SYSTEM_PROMPT } from "@/lib/ai-prompts";
import type { ExtractedAlternate } from "./alternatesExtractor";
import { extractAlternates } from "./alternatesExtractor";

// ============================================================================
// TYPES
// ============================================================================

export interface MappedPricingSection {
  sectionName: string;
  sectionNumber: string | null;
  estimatedTotal: number | null;
  lineItemCount: number;
  hasTax: boolean;
  hasBond: boolean;
  alternates: ExtractedAlternate[];
  confidence: number;
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const SECTION_HEADER_PATTERNS = [
  // "1. Concourse LED Displays" or "Section 1: Concourse LED"
  /^(?:Section\s+)?(\d+)\s*[.:\-–—]\s*([A-Z][A-Za-z0-9\s\-&/,()]+)/,
  // "CONCOURSE LED DISPLAYS" (all caps, min 10 chars)
  /^([A-Z][A-Z\s&\-/,()]{9,})$/,
  // "Area A — Path Hall Screens"
  /^(?:Area|Zone|Location)\s+([A-Z0-9]+)\s*[:\-–—]\s*(.+)/i,
];

const DOLLAR_AMOUNT = /\$\s*([\d,]+(?:\.\d{2})?)/g;
const SUBTOTAL_PATTERN = /(?:sub\s*total|subtotal)\s*[:\-–—]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i;
const GRAND_TOTAL_PATTERN = /(?:grand\s*total|total\s*(?:cost|price|amount))\s*[:\-–—]?\s*\$?\s*([\d,]+(?:\.\d{2})?)/i;
const TAX_PATTERN = /\btax\b/i;
const BOND_PATTERN = /\b(?:bond|performance\s*bond|payment\s*bond)\b/i;

// ============================================================================
// MAPPER
// ============================================================================

export function mapPricingSections(text: string): MappedPricingSection[] {
  const sections: MappedPricingSection[] = [];
  const lines = text.split("\n");

  let currentSection: Partial<MappedPricingSection> | null = null;
  let currentSectionText: string[] = [];
  let currentLineItems = 0;
  let currentHasTax = false;
  let currentHasBond = false;
  let currentTotal: number | null = null;

  const flushSection = () => {
    if (currentSection && currentSection.sectionName) {
      // Extract alternates from this section's text
      const sectionText = currentSectionText.join("\n");
      const alts = extractAlternates(sectionText);

      sections.push({
        sectionName: currentSection.sectionName,
        sectionNumber: currentSection.sectionNumber || null,
        estimatedTotal: currentTotal,
        lineItemCount: currentLineItems,
        hasTax: currentHasTax,
        hasBond: currentHasBond,
        alternates: alts,
        confidence: currentTotal !== null ? 0.8 : currentLineItems > 0 ? 0.6 : 0.4,
      });
    }
    currentSection = null;
    currentSectionText = [];
    currentLineItems = 0;
    currentHasTax = false;
    currentHasBond = false;
    currentTotal = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check for section headers
    let isNewSection = false;
    for (const pattern of SECTION_HEADER_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Don't start a new section for alternate headers
        if (/alternate|alt\s*\d/i.test(line)) continue;

        // Verify this looks like a pricing section (has dollar amounts nearby)
        const nearbyText = lines.slice(i, Math.min(i + 15, lines.length)).join(" ");
        const hasDollars = DOLLAR_AMOUNT.test(nearbyText);
        DOLLAR_AMOUNT.lastIndex = 0; // Reset regex state

        if (!hasDollars) continue;

        flushSection();

        const sectionNumber = match[1] || null;
        const sectionName = (match[2] || match[1] || match[0])
          .replace(/[:\-–—]+$/, "").trim();

        currentSection = { sectionName, sectionNumber };
        currentSectionText = [line];
        isNewSection = true;
        break;
      }
    }

    if (isNewSection) continue;

    // If we're inside a section, accumulate data
    if (currentSection) {
      currentSectionText.push(line);

      // Count line items (lines with dollar amounts that aren't totals/tax/bond)
      const dollarMatch = line.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
      if (dollarMatch) {
        const isTotal = SUBTOTAL_PATTERN.test(line) || GRAND_TOTAL_PATTERN.test(line);
        const isTax = TAX_PATTERN.test(line);
        const isBond = BOND_PATTERN.test(line);

        if (isTax) currentHasTax = true;
        if (isBond) currentHasBond = true;

        if (!isTotal && !isTax && !isBond) {
          currentLineItems++;
        }

        // Capture grand total
        const grandMatch = line.match(GRAND_TOTAL_PATTERN);
        if (grandMatch) {
          currentTotal = parseFloat(grandMatch[1].replace(/,/g, ""));
        }

        // Capture subtotal as fallback
        if (currentTotal === null) {
          const subMatch = line.match(SUBTOTAL_PATTERN);
          if (subMatch) {
            currentTotal = parseFloat(subMatch[1].replace(/,/g, ""));
          }
        }
      }
    }
  }

  // Flush last section
  flushSection();

  // If no sections found, try to detect a single pricing block
  if (sections.length === 0) {
    const allDollars = text.match(DOLLAR_AMOUNT);
    DOLLAR_AMOUNT.lastIndex = 0;
    if (allDollars && allDollars.length > 2) {
      const grandMatch = text.match(GRAND_TOTAL_PATTERN);
      const total = grandMatch
        ? parseFloat(grandMatch[1].replace(/,/g, ""))
        : null;

      sections.push({
        sectionName: "Pricing",
        sectionNumber: null,
        estimatedTotal: total,
        lineItemCount: allDollars.length,
        hasTax: TAX_PATTERN.test(text),
        hasBond: BOND_PATTERN.test(text),
        alternates: extractAlternates(text),
        confidence: 0.4,
      });
    }
  }

  return sections;
}

// ============================================================================
// AI FALLBACK
// ============================================================================

const DASHBOARD_WORKSPACE_SLUG = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";

export async function mapPricingSectionsWithAI(
  highValueText: string
): Promise<MappedPricingSection[]> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    throw new Error("AnythingLLM not configured. Set ANYTHING_LLM_URL and ANYTHING_LLM_KEY.");
  }

  const prompt = `${ANC_SYSTEM_PROMPT}

You are analyzing a bid/RFP document for ANC Sports Enterprises. Extract all distinct pricing sections and alternates.

Return ONLY valid JSON (no markdown, no explanation):

{
  "sections": [
    {
      "sectionName": "Concourse LED Displays",
      "sectionNumber": "1",
      "estimatedTotal": 1700000,
      "lineItemCount": 6,
      "hasTax": true,
      "hasBond": true,
      "alternates": [
        {
          "id": "alt-1",
          "description": "Upgrade to 2.5mm GOB",
          "priceDifference": 45000,
          "type": "upgrade",
          "relatedSection": "Concourse LED Displays",
          "confidence": 0.85
        }
      ]
    }
  ]
}

RULES:
- Each distinct pricing area/location = one section
- Extract the grand total or subtotal for each section
- Count line items (exclude tax/bond/total rows)
- Flag if tax and/or bond are present
- Extract all alternates (upgrades, deducts, add-ons, options)
- For deducts, use negative priceDifference
- Set estimatedTotal to null if not found
- Return ONLY JSON

DOCUMENT CONTENT:

${highValueText.slice(0, 50000)}`;

  const chatUrl = `${ANYTHING_LLM_BASE_URL}/workspace/${DASHBOARD_WORKSPACE_SLUG}/chat`;

  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
    },
    body: JSON.stringify({
      message: prompt,
      mode: "chat",
      sessionId: `pricing-mapper-${Date.now()}`,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AnythingLLM error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const rawContent = data.textResponse || data.response || "";

  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[Pricing Mapper AI] No JSON found in response:", rawContent.slice(0, 200));
    return [];
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.sections || []).map((s: any) => ({
      sectionName: s.sectionName || "Unknown Section",
      sectionNumber: s.sectionNumber || null,
      estimatedTotal: s.estimatedTotal ?? null,
      lineItemCount: s.lineItemCount || 0,
      hasTax: !!s.hasTax,
      hasBond: !!s.hasBond,
      alternates: (s.alternates || []).map((a: any, idx: number) => ({
        id: a.id || `alt-${idx + 1}`,
        description: a.description || "Unknown alternate",
        priceDifference: a.priceDifference ?? null,
        type: a.type || "option",
        relatedSection: a.relatedSection || s.sectionName || null,
        confidence: 0.75,
      })),
      confidence: 0.75,
    }));
  } catch (e) {
    console.error("[Pricing Mapper AI] JSON parse error:", e);
    return [];
  }
}
