/**
 * Smart Meta Extraction — extracts client name, venue, and project title
 * from the first few pages of an RFP document using regex heuristics.
 *
 * Design: best-effort extraction with confidence. If nothing is found,
 * fields are left empty — wrong pre-fill is worse than blank.
 */

export interface ExtractedMeta {
  clientName: string;
  venue: string;
  projectTitle: string;
  /** 0-1 confidence that the extraction is correct */
  confidence: number;
}

const EMPTY_META: ExtractedMeta = { clientName: "", venue: "", projectTitle: "", confidence: 0 };

/**
 * Extract project metadata from the first N pages of RFP text.
 * @param pageTexts Array of { pageNumber, text } for the first pages
 * @param maxPages How many pages to scan (default 5)
 */
export function extractProjectMeta(
  pageTexts: { pageNumber: number; text: string }[],
  maxPages = 5
): ExtractedMeta {
  const pages = pageTexts.slice(0, maxPages);
  if (pages.length === 0) return EMPTY_META;

  // Combine first pages into one block for pattern matching
  const combined = pages.map((p) => p.text).join("\n\n");
  const lines = combined.split("\n").map((l) => l.trim()).filter(Boolean);

  let clientName = "";
  let venue = "";
  let projectTitle = "";
  let confidence = 0;

  // ── Client Name ──
  // Pattern: "Prepared for: <name>" or "Owner: <name>" or "Client: <name>"
  clientName = matchAfterLabel(combined, [
    /(?:prepared\s+for|submitted\s+to|owner|client|attention|attn)[:\s]+([A-Z][A-Za-z\s&.,'-]{2,60})/i,
  ]);

  // ── Venue / Facility ──
  // Pattern: common venue keywords followed by a name
  venue = matchAfterLabel(combined, [
    /(?:venue|facility|stadium|arena|fieldhouse|center|centre|convention\s+center|amphitheater|coliseum|ballpark)[:\s]+([A-Z][A-Za-z\s&.,'-]{2,80})/i,
    /(?:at|for)\s+(?:the\s+)?([A-Z][A-Za-z\s&'-]{2,60}(?:Stadium|Arena|Fieldhouse|Center|Centre|Convention\s+Center|Amphitheater|Coliseum|Ballpark|Field|Park|Dome))/i,
  ]);

  // ── Project Title ──
  // Pattern: "Project: <title>" or "RE: <title>" or "Subject: <title>"
  projectTitle = matchAfterLabel(combined, [
    /(?:project\s*(?:name|title)?|re|subject|rfp\s+(?:for|title))[:\s]+([A-Z][A-Za-z0-9\s&.,'-]{4,120})/i,
  ]);

  // Fallback: if no project title found, try the first prominent line
  // (often the cover page has a large title as the first substantial text)
  if (!projectTitle && lines.length > 0) {
    // Look for a line that looks like a title: 4-80 chars, starts with uppercase,
    // not a common header like "Table of Contents" or "Request for Proposal"
    const SKIP_PATTERNS = /^(table\s+of\s+contents|request\s+for|rfp|rfq|confidential|page\s+\d|copyright|\d{1,2}[\/\-]\d{1,2})/i;
    for (const line of lines.slice(0, 20)) {
      if (line.length >= 8 && line.length <= 120 && /^[A-Z]/.test(line) && !SKIP_PATTERNS.test(line)) {
        // Likely a title if it doesn't end with common sentence punctuation
        if (!/[.;]$/.test(line)) {
          projectTitle = line;
          break;
        }
      }
    }
  }

  // ── Confidence scoring ──
  const found = [clientName, venue, projectTitle].filter(Boolean).length;
  if (found === 3) confidence = 0.85;
  else if (found === 2) confidence = 0.6;
  else if (found === 1) confidence = 0.35;
  else confidence = 0;

  return {
    clientName: cleanExtracted(clientName),
    venue: cleanExtracted(venue),
    projectTitle: cleanExtracted(projectTitle),
    confidence,
  };
}

/** Try each regex against text, return first captured group that matches */
function matchAfterLabel(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = match[1].trim();
      // Reject if it's too short or looks like noise
      if (value.length >= 2 && !/^\d+$/.test(value)) {
        return value;
      }
    }
  }
  return "";
}

/** Clean up extracted text: trim, collapse whitespace, remove trailing punctuation */
function cleanExtracted(s: string): string {
  return s
    .replace(/\s+/g, " ")
    .replace(/[,.:;]+$/, "")
    .trim();
}
