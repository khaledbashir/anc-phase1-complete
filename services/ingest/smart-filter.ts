const { PDFParse } = require("pdf-parse");

// Keywords that indicate "Signal" (Technical/Pricing content)
const SIGNAL_KEYWORDS = [
  "schedule", "pricing", "bid form", "display", "led", "specification", 
  "technical", "qty", "quantity", "pixel pitch", "resolution", "nits", "brightness",
  "cabinet", "module", "diode", "refresh rate", "viewing angle", "warranty",
  "spare parts", "maintenance", "structural", "steel", "weight", "lbs", "kg",
  "power", "voltage", "amps", "circuit", "data", "fiber", "cat6"
];

// Keywords that indicate "Noise" (Legal/Boilerplate)
const NOISE_KEYWORDS = [
  "indemnification", "insurance", "liability", "termination", "arbitration",
  "force majeure", "governing law", "jurisdiction", "severability", "waiver",
  "confidentiality", "intellectual property", "compliance", "equal opportunity",
  "harassment", "drug-free", "background check"
];

interface PageContent {
  pageIndex: number;
  text: string;
  score: number;
  isDrawingCandidate: boolean;
}

export interface FilterResult {
  fullText: string;
  filteredText: string;
  retainedPages: number;
  totalPages: number;
  drawingCandidates: number[];
}

/**
 * Smart Filter Service
 * Analyzes PDF content and filters out "noise" pages (legal, boilerplate)
 * while retaining "signal" pages (specs, pricing, drawings).
 */
/** Max pages to parse in one run; avoids OOM/timeouts on very large PDFs */
const MAX_PAGES_TO_PARSE = 300;

export async function smartFilterPdf(fileBuffer: Buffer): Promise<FilterResult> {
  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: fileBuffer, verbosity: 0 });

    const info = await parser.getInfo();
    const totalPagesFromDoc = Number(info?.total) || 0;
    const parseOpts = totalPagesFromDoc > MAX_PAGES_TO_PARSE ? { first: MAX_PAGES_TO_PARSE } : undefined;

    const data = await parser.getText(parseOpts);
    await parser.destroy();

    const pageTexts: string[] = Array.isArray(data.pages)
      ? data.pages.map((p: { text?: string }) => String(p?.text ?? ""))
      : [];

    const pages: PageContent[] = pageTexts.map((text, index) => {
      const lowerText = text.toLowerCase();
      let score = 0;

      for (const kw of SIGNAL_KEYWORDS) {
        if (lowerText.includes(kw)) score += 6;
      }
      for (const kw of NOISE_KEYWORDS) {
        if (lowerText.includes(kw)) score -= 3;
      }

      const hasMeasurements =
        /\b\d+(\.\d+)?\s?(ft|feet|in|inch|inches|mm|cm|m|v|vac|amp|amps|hz|w|kw)\b/i.test(text) ||
        /\b\d{2,4}\s?x\s?\d{2,4}\b/i.test(text) ||
        /\b\d+(\.\d+)?\s?'\s?[x×]\s?\d+(\.\d+)?\s?'\b/i.test(text);
      if (hasMeasurements) score += 8;

      const looksLikeDrawing =
        text.trim().length < 350 &&
        (lowerText.includes("scale") ||
          lowerText.includes("detail") ||
          lowerText.includes("elevation") ||
          lowerText.includes("section") ||
          lowerText.includes("plan") ||
          lowerText.includes("drawing") ||
          lowerText.includes("dwg"));

      const isDrawingCandidate = looksLikeDrawing;
      if (isDrawingCandidate) score += 15;

      return { pageIndex: index, text, score, isDrawingCandidate };
    });

    const totalPages = Number.isFinite(totalPagesFromDoc) && totalPagesFromDoc > 0
      ? totalPagesFromDoc
      : (Number.isFinite(Number(data.total)) ? Number(data.total) : pages.length);

    const drawingCandidates = pages
      .filter((p) => p.isDrawingCandidate)
      .map((p) => p.pageIndex + 1);

    const MIN_SCORE_TO_KEEP = 8;
    const MAX_PAGES_TO_KEEP = totalPages > 250 ? 80 : 120;
    const MAX_CHARS_TO_KEEP = 350_000;

    const retained = pages
      .filter((p) => p.isDrawingCandidate || p.score >= MIN_SCORE_TO_KEEP)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_PAGES_TO_KEEP)
      .sort((a, b) => a.pageIndex - b.pageIndex);

    let filteredContent = `SMART_FILTER\nTOTAL_PAGES=${totalPages}\nRETAINED_PAGES=${retained.length}\nPAGES=${retained.map((p) => p.pageIndex + 1).join(",")}\n\n`;
    let used = filteredContent.length;

    for (const p of retained) {
      const block = `--- PAGE ${p.pageIndex + 1} (Score: ${p.score}) ---\n${p.text}\n\n`;
      if (used + block.length > MAX_CHARS_TO_KEEP) break;
      filteredContent += block;
      used += block.length;
    }

    return {
      fullText: String(data.text ?? ""),
      filteredText: filteredContent,
      retainedPages: retained.length,
      totalPages,
      drawingCandidates,
    };
  } catch (error) {
    console.error("Smart Filter Error:", error);
    throw error;
  }
}
