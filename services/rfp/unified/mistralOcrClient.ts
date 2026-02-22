/**
 * Mistral OCR Client — Direct API
 *
 * Calls Mistral OCR API directly (https://api.mistral.ai/v1/ocr).
 * No middleman service. Sends image as base64, gets structured markdown back.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const MISTRAL_API_BASE = process.env.MISTRAL_API_BASE_URL || "https://api.mistral.ai";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const MISTRAL_OCR_MODEL = process.env.MISTRAL_OCR_MODEL || "mistral-ocr-latest";

// ---------------------------------------------------------------------------
// Types
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
// Extract a SINGLE page IMAGE — vision model actually SEES the page
// This is the main function used by the pipeline.
// ---------------------------------------------------------------------------

export async function extractSinglePage(
  imagePath: string,
  pageNumber: number,
): Promise<MistralOcrPage> {
  if (!MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY not set — cannot call Mistral OCR");
  }

  const { readFile } = await import("fs/promises");
  const imageBuffer = await readFile(imagePath);
  const base64 = imageBuffer.toString("base64");
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000); // 60s per page

  try {
    const res = await fetch(`${MISTRAL_API_BASE}/v1/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_OCR_MODEL,
        document: {
          type: "image_url",
          image_url: dataUrl,
        },
        include_image_base64: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mistral OCR ${res.status}: ${text.slice(0, 300)}`);
    }

    const data: MistralOcrResult = await res.json();

    if (!data.pages || data.pages.length === 0) {
      return {
        index: 0,
        markdown: "",
        images: [],
        tables: [],
        hyperlinks: [],
        header: null,
        footer: null,
        dimensions: { dpi: 0, height: 0, width: 0 },
      };
    }

    return data.pages[0];
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(`Mistral OCR page ${pageNumber} failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Extract full document via Mistral OCR (for smaller PDFs)
// ---------------------------------------------------------------------------

export async function extractWithMistral(
  buffer: Buffer,
  filename: string,
): Promise<MistralOcrResult> {
  if (!MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY not set — cannot call Mistral OCR");
  }

  const base64 = buffer.toString("base64");
  const mime = guessMime(filename);
  const dataUrl = `data:${mime};base64,${base64}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 300_000); // 5 min for full docs

  try {
    const res = await fetch(`${MISTRAL_API_BASE}/v1/ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: MISTRAL_OCR_MODEL,
        document: {
          type: "image_url",
          image_url: dataUrl,
        },
        include_image_base64: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Mistral OCR ${res.status}: ${text.slice(0, 300)}`);
    }

    const data: MistralOcrResult = await res.json();

    if (!data.pages || data.pages.length === 0) {
      return {
        pages: [],
        model: MISTRAL_OCR_MODEL,
        document_annotation: null,
        usage_info: null,
      };
    }

    return data;
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(`Mistral OCR extraction failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export async function mistralOcrHealthCheck(): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
}> {
  if (!MISTRAL_API_KEY) {
    return { ok: false, error: "MISTRAL_API_KEY not configured" };
  }

  try {
    // Simple models list call to verify the key works
    const res = await fetch(`${MISTRAL_API_BASE}/v1/models`, {
      headers: { Authorization: `Bearer ${MISTRAL_API_KEY}` },
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      return { ok: true, url: MISTRAL_API_BASE };
    }
    return { ok: false, error: `Mistral API returned ${res.status}` };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
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
