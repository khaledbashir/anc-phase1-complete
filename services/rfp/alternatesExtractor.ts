/**
 * Alternates Extractor — P49b
 *
 * Detects and extracts alternate/upsell/deduct line items from RFP and bid documents.
 * Examples: "Upgrade to 2.5mm GOB", "Add Hoist Materials", "Deduct for owner-furnished power".
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedAlternate {
  id: string;
  description: string;
  priceDifference: number | null;
  type: "upgrade" | "downgrade" | "add-on" | "deduct" | "option";
  relatedSection: string | null;
  confidence: number;
}

// ============================================================================
// REGEX PATTERNS
// ============================================================================

const ALTERNATE_HEADER_PATTERNS = [
  /(?:ALTERNATE|ALT)\s*[-–—#]?\s*(\d+)\s*[:\-–—]\s*(.+)/i,
  /(?:Option|OPT)\s*[-–—#]?\s*(\d+)\s*[:\-–—]\s*(.+)/i,
  /(?:ADD|DEDUCT)\s+(?:ALTERNATE|ALT)\s*[-–—#]?\s*(\d+)\s*[:\-–—]?\s*(.*)/i,
];

const ALTERNATE_LINE_PATTERNS = [
  // "Alt 1 — Upgrade to 2.5mm GOB   $45,000"
  /(?:Alt|Alternate|Option)\s*[-–—#]?\s*(\d+)\s*[-–—:]\s*(.+?)\s+\$?([\d,]+(?:\.\d{2})?)/i,
  // "Upgrade to 2.5mm GOB   $45,000"
  /(?:Upgrade\s+to|Add\s+|Deduct\s+(?:for\s+)?|Include\s+|Remove\s+)(.+?)\s+\$?([\d,]+(?:\.\d{2})?)/i,
  // "ADD to cost above: $12,500"
  /(?:ADD|DEDUCT)\s+(?:to|from)\s+cost\s+(?:above|below)\s*[:\-–—]?\s*\$?([\d,]+(?:\.\d{2})?)/i,
];

const DOLLAR_PATTERN = /\$\s*([\d,]+(?:\.\d{2})?)/;

const TYPE_INDICATORS: Array<{ pattern: RegExp; type: ExtractedAlternate["type"] }> = [
  { pattern: /upgrade|premium|enhanced|higher\s*res|finer\s*pitch|GOB/i, type: "upgrade" },
  { pattern: /downgrade|lower|reduce|economy|standard/i, type: "downgrade" },
  { pattern: /add\b|hoist|additional|include|supplement/i, type: "add-on" },
  { pattern: /deduct|remove|exclude|delete|omit|owner[\s-]*furnish/i, type: "deduct" },
  { pattern: /option|optional|alternate/i, type: "option" },
];

// ============================================================================
// EXTRACTOR
// ============================================================================

export function extractAlternates(text: string): ExtractedAlternate[] {
  const alternates: ExtractedAlternate[] = [];
  const lines = text.split("\n");
  let altCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Strategy 1: Explicit alternate headers (Alt 1, Alt-2, Option 3)
    for (const pattern of ALTERNATE_HEADER_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        altCounter++;
        const num = match[1];
        let desc = (match[2] || "").trim();

        // Look for dollar amount on same line or next line
        let price: number | null = null;
        const dollarMatch = line.match(DOLLAR_PATTERN);
        if (dollarMatch) {
          price = parseFloat(dollarMatch[1].replace(/,/g, ""));
        } else if (i + 1 < lines.length) {
          const nextDollar = lines[i + 1].match(DOLLAR_PATTERN);
          if (nextDollar) {
            price = parseFloat(nextDollar[1].replace(/,/g, ""));
          }
        }

        // If description is empty, grab from next non-empty line
        if (!desc && i + 1 < lines.length) {
          desc = lines[i + 1].trim().replace(/\$[\d,]+(\.\d{2})?/, "").trim();
        }

        const type = detectType(line + " " + desc);

        // Negate price for deducts
        if (type === "deduct" && price !== null && price > 0) {
          price = -price;
        }

        alternates.push({
          id: `alt-${num || altCounter}`,
          description: desc || `Alternate ${num || altCounter}`,
          priceDifference: price,
          type,
          relatedSection: findRelatedSection(lines, i),
          confidence: price !== null ? 0.85 : 0.6,
        });
        break;
      }
    }

    // Strategy 2: Inline alternate lines with pricing
    if (!ALTERNATE_HEADER_PATTERNS.some(p => p.test(line))) {
      for (const pattern of ALTERNATE_LINE_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          altCounter++;

          let desc: string;
          let price: number | null = null;

          if (match.length >= 4) {
            // Pattern with number + description + price
            desc = match[2].trim();
            price = parseFloat(match[3].replace(/,/g, ""));
          } else if (match.length >= 3) {
            desc = match[1].trim();
            price = parseFloat(match[2].replace(/,/g, ""));
          } else {
            desc = match[1]?.trim() || line.slice(0, 80);
            const dollarMatch = line.match(DOLLAR_PATTERN);
            if (dollarMatch) price = parseFloat(dollarMatch[1].replace(/,/g, ""));
          }

          // Skip if this looks like a regular line item (no alternate keywords)
          if (!/alt|alternate|option|upgrade|deduct|add\b/i.test(line)) continue;

          const type = detectType(line);

          if (type === "deduct" && price !== null && price > 0) {
            price = -price;
          }

          // Deduplicate
          const isDupe = alternates.some(a =>
            a.description.toLowerCase() === desc.toLowerCase()
          );
          if (isDupe) continue;

          alternates.push({
            id: `alt-${altCounter}`,
            description: desc,
            priceDifference: price,
            type,
            relatedSection: findRelatedSection(lines, i),
            confidence: price !== null ? 0.8 : 0.55,
          });
          break;
        }
      }
    }
  }

  return alternates;
}

// ============================================================================
// HELPERS
// ============================================================================

function detectType(text: string): ExtractedAlternate["type"] {
  for (const { pattern, type } of TYPE_INDICATORS) {
    if (pattern.test(text)) return type;
  }
  return "option";
}

function findRelatedSection(lines: string[], currentIdx: number): string | null {
  // Look backwards for the nearest section header
  for (let j = currentIdx - 1; j >= Math.max(0, currentIdx - 30); j--) {
    const line = lines[j].trim();
    if (!line) continue;
    // Section header patterns
    if (/^(?:SECTION|PART|DIVISION)\s/i.test(line)) return line.slice(0, 100);
    if (/^[A-Z][A-Z\s&\-/]{8,}$/.test(line)) return line.slice(0, 100);
    if (/^\d{1,2}(?:\.\d{1,2}){0,2}\s+[A-Z]/.test(line)) return line.slice(0, 100);
  }
  return null;
}
