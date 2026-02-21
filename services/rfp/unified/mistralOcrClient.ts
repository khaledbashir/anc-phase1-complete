/**
 * Mistral OCR Client
 *
 * Calls the ocrrrr service (Next.js wrapper around Mistral OCR API).
 * Returns structured markdown + tables + images per page.
 */

// ---------------------------------------------------------------------------
// URLs — Docker internal first, then external
// ---------------------------------------------------------------------------

const OCRRRR_URLS = [
  "http://ocrrrr:3000",
  "http://basheer_ocrrrr:3000",
  process.env.OCRRRR_URL || "https://basheer-ocrrrr.prd42b.easypanel.host",
];

// ---------------------------------------------------------------------------
// Types (matches the ocrrrr service response shape)
// ---------------------------------------------------------------------------

export interface MistralOcrPage {
  index: number;
  markdown: string;
  images: Array<{ id: string; data?: string }>;
  tables: Array<{ id: string; content: string; format: string }>;
  hyperlinks: Array<{ url: string; text: string }>;
  header: string | null;
  footer: string | null;
  dimensions: { dpi: number; height: number; width: number };
}

export interface MistralOcrResult {
  pages: MistralOcrPage[];
  model: string;
  document_annotation: string | null;
  usage_info: {
    pages_processed: number;
    doc_size_bytes: number;
  } | null;
}

// ---------------------------------------------------------------------------
// Extract document via Mistral OCR
// ---------------------------------------------------------------------------

export async function extractWithMistral(
  buffer: Buffer,
  filename: string,
): Promise<MistralOcrResult> {
  const form = new FormData();
  const blob = new Blob([buffer], { type: guessMime(filename) });
  form.append("file", blob, filename);

  let lastError: Error | null = null;

  for (const base of OCRRRR_URLS) {
    try {
      const controller = new AbortController();
      // 5 min timeout for large PDFs (Mistral processes page-by-page)
      const timer = setTimeout(() => controller.abort(), 300_000);

      const res = await fetch(`${base}/api/extract`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Mistral OCR ${res.status}: ${text.slice(0, 300)}`);
      }

      const json = await res.json();

      // The ocrrrr service returns { extraction: {...}, data: {...} } on POST
      const data: MistralOcrResult = json.data || json;

      if (!data.pages || data.pages.length === 0) {
        return {
          pages: [],
          model: "mistral-ocr-latest",
          document_annotation: null,
          usage_info: null,
        };
      }

      return data;
    } catch (err: any) {
      lastError = err;
      if (base !== OCRRRR_URLS[OCRRRR_URLS.length - 1]) {
        console.warn(`[MistralOCR] ${base} failed: ${err.message}`);
      }
    }
  }

  throw new Error(
    `Mistral OCR extraction failed (all endpoints): ${lastError?.message || "unknown"}`,
  );
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function mistralOcrHealthCheck(): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
}> {
  for (const base of OCRRRR_URLS) {
    try {
      const res = await fetch(`${base}/api/extract`, {
        method: "GET",
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        return { ok: true, url: base };
      }
    } catch {
      // try next
    }
  }
  return { ok: false, error: "All Mistral OCR endpoints unreachable" };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function guessMime(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    tiff: "image/tiff",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext] || "application/octet-stream";
}
