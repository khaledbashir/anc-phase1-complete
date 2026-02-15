/**
 * Kreuzberg Document Extraction Client
 *
 * Universal backend for all server-side document text extraction.
 * Replaces unpdf + pdf-parse across the entire codebase.
 *
 * Kreuzberg v4.3.2: Rust core, Tesseract + PaddleOCR, 75+ formats.
 * Docker internal: http://kreuz:8000
 * External:        https://basheer-kreuz.prd42b.easypanel.host
 */

// ---------------------------------------------------------------------------
// URLs (try Docker-internal first, then external fallback)
// ---------------------------------------------------------------------------

const KREUZBERG_URLS = [
  "http://kreuz:8000",
  "http://basheer_kreuz:8000",
  process.env.KREUZBERG_URL || "https://basheer-kreuz.prd42b.easypanel.host",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KreuzbergPage {
  page_number: number;
  content: string;
  width?: number;
  height?: number;
}

export interface KreuzbergTable {
  headers: string[];
  rows: string[][];
}

export interface KreuzbergExtractionResult {
  content: string;
  tables: KreuzbergTable[];
  metadata: Record<string, any>;
  mime_type: string;
  pages?: KreuzbergPage[];
  images?: any[];
  ocr_elements?: any[];
  detected_languages?: string[];
}

/**
 * Compatibility shape matching unpdf's extractText return value.
 * Used as drop-in replacement across the codebase.
 */
export interface ExtractTextResult {
  text: string;
  totalPages: number;
  /** Real per-page content from Kreuzberg (not form-feed guessing). */
  pages: Array<{ pageNumber: number; text: string }>;
}

// ---------------------------------------------------------------------------
// MIME helper
// ---------------------------------------------------------------------------

function guessMime(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    rtf: "application/rtf",
    html: "text/html",
    xml: "application/xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    tiff: "image/tiff",
    tif: "image/tiff",
    bmp: "image/bmp",
    webp: "image/webp",
  };
  return map[ext] || "application/octet-stream";
}

// ---------------------------------------------------------------------------
// Core extraction
// ---------------------------------------------------------------------------

/**
 * Full Kreuzberg extraction — returns the rich structured result.
 */
export async function extractDocument(
  buffer: Buffer,
  filename: string,
): Promise<KreuzbergExtractionResult> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: guessMime(filename) });
  form.append("files", blob, filename);

  let lastError: Error | null = null;

  for (const base of KREUZBERG_URLS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 180_000); // 3 min for large docs

      const res = await fetch(`${base}/extract`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Kreuzberg ${res.status}: ${text.slice(0, 300)}`);
      }

      const results: KreuzbergExtractionResult[] = await res.json();

      if (!results || results.length === 0) {
        return { content: "", tables: [], metadata: {}, mime_type: "unknown" };
      }

      return results[0];
    } catch (err: any) {
      lastError = err;
      // Only warn for internal URLs — external is the last resort
      if (base !== KREUZBERG_URLS[KREUZBERG_URLS.length - 1]) {
        console.warn(`[Kreuzberg] ${base} failed: ${err.message}`);
      }
    }
  }

  throw new Error(
    `Kreuzberg extraction failed (all endpoints): ${lastError?.message || "unknown"}`
  );
}

// ---------------------------------------------------------------------------
// unpdf-compatible wrapper (drop-in replacement)
// ---------------------------------------------------------------------------

/**
 * Drop-in replacement for unpdf's extractText.
 *
 * Before:
 *   const { extractText } = await import("unpdf");
 *   const result = await extractText(new Uint8Array(buffer));
 *
 * After:
 *   import { extractText } from "@/services/kreuzberg/kreuzbergClient";
 *   const result = await extractText(buffer, "file.pdf");
 */
export async function extractText(
  buffer: Buffer | Uint8Array,
  filename: string = "document.pdf",
): Promise<ExtractTextResult> {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const result = await extractDocument(buf, filename);

  const pages = result.pages
    ? result.pages.map((p) => ({ pageNumber: p.page_number, text: p.content }))
    : splitByFormFeed(result.content);

  return {
    text: result.content,
    totalPages: pages.length || Math.max(1, Math.ceil(result.content.length / 3000)),
    pages,
  };
}

/**
 * Fallback page splitting when Kreuzberg doesn't return per-page data.
 * Mimics the old unpdf form-feed behavior.
 */
function splitByFormFeed(text: string): Array<{ pageNumber: number; text: string }> {
  const raw = text.split(/\f/);
  return raw
    .map((t, i) => ({ pageNumber: i + 1, text: t.trim() }))
    .filter((p) => p.text.length > 0);
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function healthCheck(): Promise<{
  ok: boolean;
  version?: string;
  url?: string;
  error?: string;
}> {
  for (const base of KREUZBERG_URLS) {
    try {
      const res = await fetch(`${base}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const data = await res.json();
        return { ok: true, version: data.version, url: base };
      }
    } catch {
      // try next
    }
  }
  return { ok: false, error: "All Kreuzberg endpoints unreachable" };
}
