export type PageType = "text" | "drawing";

export interface PageScore {
  pageIndex: number;
  pageNumber: number;
  pageType: PageType;
  score: number;
  keywordHits: number;
  textLength: number;
  textSnippet: string;
  hasText: boolean;
}

export interface ClassificationResult {
  textPages: PageScore[];
  drawingPages: PageScore[];
  totalChars: number;
  totalPages: number;
  isLikelyScanned: boolean;
}

export interface ScoringResult {
  pages: PageScore[];
  totalChars: number;
  totalPages: number;
  isLikelyScanned: boolean;
}

const TEXT_THRESHOLD_CHARS = 50;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.\-_/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeKeyword(keyword: string): string {
  return keyword
    .toLowerCase()
    .replace(/[.\-_/\\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countKeywordHits(normalizedText: string, normalizedKeywords: string[]): number {
  let hits = 0;
  for (const kw of normalizedKeywords) {
    if (!kw) continue;
    let startIndex = 0;
    while (true) {
      const idx = normalizedText.indexOf(kw, startIndex);
      if (idx === -1) break;
      hits++;
      startIndex = idx + kw.length;
    }
  }
  return hits;
}

function extractSnippet(text: string, keywords: string[], maxLength: number = 120): string {
  const lowerText = text.toLowerCase();
  for (const kw of keywords) {
    const normalKw = kw.toLowerCase().trim();
    if (!normalKw) continue;
    const idx = lowerText.indexOf(normalKw);
    if (idx !== -1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + normalKw.length + 80);
      const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
      return (start > 0 ? "..." : "") + snippet + (end < text.length ? "..." : "");
    }
  }
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) + "..." : cleaned;
}

export function classifyAndScorePages(
  pageTexts: string[],
  keywords: string[]
): ClassificationResult {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter(Boolean);
  const totalPages = pageTexts.length;
  let totalChars = 0;

  const textPages: PageScore[] = [];
  const drawingPages: PageScore[] = [];

  for (let index = 0; index < pageTexts.length; index++) {
    const text = pageTexts[index];
    const textLength = text.length;
    totalChars += textLength;
    const hasText = textLength >= TEXT_THRESHOLD_CHARS;
    const pageType: PageType = hasText ? "text" : "drawing";

    if (pageType === "drawing") {
      drawingPages.push({
        pageIndex: index,
        pageNumber: index + 1,
        pageType: "drawing",
        score: 0,
        keywordHits: 0,
        textLength,
        textSnippet: textLength > 0
          ? extractSnippet(text, keywords)
          : "(No text detected)",
        hasText: false,
      });
      continue;
    }

    if (normalizedKeywords.length === 0) {
      textPages.push({
        pageIndex: index,
        pageNumber: index + 1,
        pageType: "text",
        score: 0,
        keywordHits: 0,
        textLength,
        textSnippet: extractSnippet(text, keywords),
        hasText: true,
      });
      continue;
    }

    const normalizedText = normalizeText(text);
    const keywordHits = countKeywordHits(normalizedText, normalizedKeywords);

    const score = keywordHits > 0
      ? keywordHits / Math.sqrt(Math.max(normalizedText.length, 1))
      : 0;

    textPages.push({
      pageIndex: index,
      pageNumber: index + 1,
      pageType: "text",
      score,
      keywordHits,
      textLength,
      textSnippet: extractSnippet(text, keywords),
      hasText: true,
    });
  }

  const avgCharsPerPage = totalPages > 0 ? totalChars / totalPages : 0;
  const isLikelyScanned = totalPages > 0 && avgCharsPerPage < 50;

  return { textPages, drawingPages, totalChars, totalPages, isLikelyScanned };
}

export function scorePages(
  pageTexts: string[],
  keywords: string[]
): ScoringResult {
  const result = classifyAndScorePages(pageTexts, keywords);
  return {
    pages: [...result.textPages, ...result.drawingPages].sort(
      (a, b) => a.pageIndex - b.pageIndex
    ),
    totalChars: result.totalChars,
    totalPages: result.totalPages,
    isLikelyScanned: result.isLikelyScanned,
  };
}

export function splitByThreshold(
  pages: PageScore[],
  threshold: number
): { keep: PageScore[]; discard: PageScore[] } {
  const keep: PageScore[] = [];
  const discard: PageScore[] = [];

  for (const page of pages) {
    if (page.score >= threshold) {
      keep.push(page);
    } else {
      discard.push(page);
    }
  }

  keep.sort((a, b) => b.score - a.score);
  discard.sort((a, b) => a.score - b.score);

  return { keep, discard };
}
