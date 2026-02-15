/**
 * RFP Text Extraction Service — P71
 *
 * Extracts raw text from uploaded RFP PDFs (100-2500 pages).
 * Uses Kreuzberg (Tesseract + PaddleOCR) for server-side extraction.
 */

import { extractText } from "@/services/kreuzberg/kreuzbergClient";

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
    const result = await extractText(buffer, filename);

    const startPage = options?.startPage || 1;
    const endPage = options?.endPage || result.totalPages;

    const pages = (result.pages || [])
        .filter((p) => p.pageNumber >= startPage && p.pageNumber <= endPage)
        .filter((p) => p.text.length > 0);

    return {
        filename,
        pageCount: result.totalPages,
        fullText: result.text,
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
