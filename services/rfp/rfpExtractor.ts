/**
 * RFP Text Extraction Service — P71
 *
 * Extracts raw text from uploaded RFP PDFs (100-2500 pages).
 * Uses pdf-parse for server-side text extraction.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ExtractedRFP {
    filename: string;
    pageCount: number;
    fullText: string;
    pages: Array<{ pageNumber: number; text: string }>;
    metadata: {
        title?: string;
        author?: string;
        creationDate?: string;
        extractedAt: string;
        fileSizeBytes: number;
    };
}

export interface ExtractionOptions {
    maxPages?: number; // Limit extraction to first N pages
    startPage?: number; // Start from specific page
    endPage?: number; // End at specific page
}

// ============================================================================
// EXTRACTOR
// ============================================================================

/**
 * Extract text from a PDF buffer.
 */
export async function extractTextFromPDF(
    buffer: Buffer,
    filename: string,
    options?: ExtractionOptions
): Promise<ExtractedRFP> {
    // unpdf: works in Node.js serverless (no web worker needed)
    const { extractText } = await import("unpdf");

    const result = await extractText(new Uint8Array(buffer));
    const fullText = typeof result.text === "string" ? result.text : (result.text || []).join("\n\n");
    const totalPages = result.totalPages || Math.ceil(fullText.length / 3000);

    const startPage = options?.startPage || 1;
    const endPage = options?.endPage || totalPages;

    // Split text by form feed characters to approximate pages
    const rawPages = fullText.split(/\f/);
    const pages = rawPages
        .map((text: string, idx: number) => ({
            pageNumber: idx + 1,
            text: text.trim(),
        }))
        .filter((p: any) => p.pageNumber >= startPage && p.pageNumber <= endPage)
        .filter((p: any) => p.text.length > 0);

    return {
        filename,
        pageCount: totalPages,
        fullText,
        pages,
        metadata: {
            extractedAt: new Date().toISOString(),
            fileSizeBytes: buffer.length,
        },
    };
}

/**
 * Extract text from a specific page range.
 */
export async function extractPageRange(
    buffer: Buffer,
    filename: string,
    startPage: number,
    endPage: number
): Promise<ExtractedRFP> {
    return extractTextFromPDF(buffer, filename, { startPage, endPage });
}
