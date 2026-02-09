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
    // Dynamic import to avoid bundling pdf-parse in client
    const pdfParseModule = await import("pdf-parse");
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;

    const data = await pdfParse(buffer, {
        max: options?.maxPages || 0, // 0 = all pages
    });

    // Split text by page breaks (form feed character)
    const rawPages = data.text.split(/\f/);
    const startPage = options?.startPage || 1;
    const endPage = options?.endPage || rawPages.length;

    const pages = rawPages
        .map((text: string, idx: number) => ({
            pageNumber: idx + 1,
            text: text.trim(),
        }))
        .filter((p: any) => p.pageNumber >= startPage && p.pageNumber <= endPage)
        .filter((p: any) => p.text.length > 0);

    return {
        filename,
        pageCount: data.numpages,
        fullText: pages.map((p: any) => p.text).join("\n\n"),
        pages,
        metadata: {
            title: data.info?.Title,
            author: data.info?.Author,
            creationDate: data.info?.CreationDate,
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
