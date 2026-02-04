/**
 * TTE Tonnage Extractor
 * Extracts structural steel tonnage from Thornton Tomasetti reports
 * Validates against WVU sample: L19084.00
 */

export interface TonnageItem {
  tons: number;
  type: 'reinforcing' | 'new' | 'structural' | 'unknown';
  context: string;
  confidence: number;
}

export interface TonnageResult {
  items: TonnageItem[];
  totalTons: number;
  steelCost: number;
  hasTTE: boolean;
  confidence: number;
  source: string;
}

// Primary patterns: "17 tons of reinforcing steel", "17 tons of new steel"
const TONNAGE_PATTERNS = [
  {
    regex: /(\d+)\s*tons?\s+of\s+reinforcing\s+steel/gi,
    type: 'reinforcing' as const,
    confidence: 0.95
  },
  {
    regex: /(\d+)\s*tons?\s+of\s+new\s+steel/gi,
    type: 'new' as const,
    confidence: 0.95
  },
  {
    regex: /(\d+)\s*tons?\s+of\s+structural\s+steel/gi,
    type: 'structural' as const,
    confidence: 0.90
  },
  // Fallback: "approximately 17 tons" or "17 tons"
  {
    regex: /(?:approximately|about|~)?\s*(\d+)\s*tons?(?:\s+of\s+steel)?/gi,
    type: 'unknown' as const,
    confidence: 0.70
  }
];

// Detect if document is a TTE report
const TTE_INDICATORS = [
  /thornton\s+tomasetti/i,
  /TTE/i,
  /feasibility\s+study/i,
  /structural\s+(?:evaluation|analysis|report)/i,
  /reinforcing\s+steel/i,
  /new\s+steel\s+columns/i
];

/**
 * Check if text appears to be from a TTE/structural report
 */
export function isTTEReport(text: string): boolean {
  const lowerText = text.toLowerCase();
  return TTE_INDICATORS.some(pattern => pattern.test(lowerText));
}

/**
 * Extract tonnage from TTE report text
 */
export function extractTonnage(text: string): TonnageResult {
  const items: TonnageItem[] = [];
  const seenPositions = new Set<number>(); // Track match positions to avoid duplicates
  
  // Track which text positions have been matched by higher-confidence patterns
  const matchedRanges: Array<{ start: number; end: number }> = [];
  
  for (const pattern of TONNAGE_PATTERNS) {
    const matches = Array.from(text.matchAll(pattern.regex));
    
    for (const match of matches) {
      const tons = parseInt(match[1], 10);
      const start = match.index ?? 0;
      const end = start + match[0].length;
      
      // Skip if this range overlaps with a higher-confidence match
      const overlaps = matchedRanges.some(r => 
        (start >= r.start && start < r.end) || 
        (end > r.start && end <= r.end) ||
        (start <= r.start && end >= r.end)
      );
      if (overlaps) continue;
      
      // Skip position duplicates
      if (seenPositions.has(start)) continue;
      seenPositions.add(start);
      
      // Validate: reasonable tonnage range for LED projects
      if (tons < 1 || tons > 500) continue; // Sanity check
      
      // Record this match
      matchedRanges.push({ start, end });
      
      items.push({
        tons,
        type: pattern.type,
        context: match[0].trim().replace(/\s+/g, ' '),
        confidence: pattern.confidence
      });
    }
  }
  
  // Calculate totals
  const totalTons = items.reduce((sum, item) => sum + item.tons, 0);
  const steelCost = totalTons * 3000; // $3,000/ton per REQ-86
  
  // Overall confidence
  const avgConfidence = items.length > 0
    ? items.reduce((sum, item) => sum + item.confidence, 0) / items.length
    : 0;
  
  return {
    items,
    totalTons,
    steelCost,
    hasTTE: items.length > 0,
    confidence: avgConfidence,
    source: 'TTE_REPORT'
  };
}

/**
 * Main entry point: analyze document for TTE content and extract tonnage
 */
export function analyzeTTEContent(text: string): TonnageResult {
  // Check if this looks like a TTE report
  if (!isTTEReport(text)) {
    return {
      items: [],
      totalTons: 0,
      steelCost: 0,
      hasTTE: false,
      confidence: 0,
      source: 'NO_TTE_DETECTED'
    };
  }
  
  return extractTonnage(text);
}

/**
 * Format tonnage result for Gap Fill or direct use
 */
export function formatTonnageForDisplay(result: TonnageResult): string {
  if (!result.hasTTE) {
    return "No structural steel tonnage found in TTE report.";
  }
  
  const lines = [
    `**Structural Steel: ${result.totalTons} tons**`,
    `**Steel Cost: $${result.steelCost.toLocaleString()}** (@ $3,000/ton)`,
    "",
    "**Breakdown:**"
  ];
  
  for (const item of result.items) {
    const typeLabel = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    lines.push(`- ${item.tons} tons (${typeLabel}): "${item.context}"`);
  }
  
  return lines.join('\n');
}
