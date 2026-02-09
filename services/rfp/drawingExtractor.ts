/**
 * Drawing Page Extractor — P75
 *
 * Extracts A-/AV-prefixed drawing pages from large RFP PDFs.
 * Identifies architectural and AV drawing sheets for reference.
 * Experimental — relies on page header/title block patterns.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedDrawing {
    pageNumber: number;
    sheetId: string;       // e.g., "A-101", "AV-201"
    title?: string;
    category: "architectural" | "av" | "electrical" | "structural" | "other";
    confidence: number;
}

export interface DrawingExtractionResult {
    drawings: ExtractedDrawing[];
    totalFound: number;
    categories: Record<string, number>;
}

// ============================================================================
// PATTERNS
// ============================================================================

const SHEET_PATTERNS = [
    { pattern: /\b(A-\d{3}[A-Z]?)\b/i, category: "architectural" as const },
    { pattern: /\b(AV-\d{3}[A-Z]?)\b/i, category: "av" as const },
    { pattern: /\b(E-\d{3}[A-Z]?)\b/i, category: "electrical" as const },
    { pattern: /\b(S-\d{3}[A-Z]?)\b/i, category: "structural" as const },
    { pattern: /\b(EL-\d{3}[A-Z]?)\b/i, category: "electrical" as const },
    { pattern: /\b(AV\d{3}[A-Z]?)\b/i, category: "av" as const },
];

const TITLE_BLOCK_PATTERN = /(?:SHEET\s+TITLE|DRAWING\s+TITLE)[:\s]*([^\n]+)/i;

// ============================================================================
// EXTRACTOR
// ============================================================================

/**
 * Extract drawing pages from RFP page text.
 */
export function extractDrawingPages(
    pages: Array<{ pageNumber: number; text: string }>
): DrawingExtractionResult {
    const drawings: ExtractedDrawing[] = [];
    const seen = new Set<string>();

    for (const page of pages) {
        const text = page.text;

        for (const { pattern, category } of SHEET_PATTERNS) {
            const match = text.match(pattern);
            if (match) {
                const sheetId = match[1].toUpperCase();
                const key = `${sheetId}-${page.pageNumber}`;
                if (seen.has(key)) continue;
                seen.add(key);

                // Try to extract title
                const titleMatch = text.match(TITLE_BLOCK_PATTERN);
                const title = titleMatch ? titleMatch[1].trim() : undefined;

                drawings.push({
                    pageNumber: page.pageNumber,
                    sheetId,
                    title,
                    category,
                    confidence: 0.80,
                });
            }
        }
    }

    // Sort by sheet ID
    drawings.sort((a, b) => a.sheetId.localeCompare(b.sheetId));

    // Count by category
    const categories: Record<string, number> = {};
    for (const d of drawings) {
        categories[d.category] = (categories[d.category] || 0) + 1;
    }

    return {
        drawings,
        totalFound: drawings.length,
        categories,
    };
}

/**
 * Get only AV-related drawings (most relevant for LED display projects).
 */
export function getAVDrawings(result: DrawingExtractionResult): ExtractedDrawing[] {
    return result.drawings.filter((d) => d.category === "av");
}
