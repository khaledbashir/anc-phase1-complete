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
    // pdf-parse v2: class-based API with Uint8Array input
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PDFParse } = require("pdf-parse");

    const parser = new PDFParse(new Uint8Array(buffer));
    await parser.load();
    const textResult = await parser.getText();
    const info = await parser.getInfo();

    const totalPages = info.total || textResult.total || textResult.pages?.length || 0;
    const startPage = options?.startPage || 1;
    const endPage = options?.endPage || totalPages;

    const pages = (textResult.pages || [])
        .map((p: any, idx: number) => ({
            pageNumber: idx + 1,
            text: (p.text || "").trim(),
        }))
        .filter((p: any) => p.pageNumber >= startPage && p.pageNumber <= endPage)
        .filter((p: any) => p.text.length > 0);

    return {
        filename,
        pageCount: totalPages,
        fullText: textResult.text || pages.map((p: any) => p.text).join("\n\n"),
        pages,
        metadata: {
            title: info.info?.Title,
            author: info.info?.Author,
            creationDate: info.info?.CreationDate,
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
