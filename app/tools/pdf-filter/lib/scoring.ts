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

import type { WeightedKeyword } from "./keyword-presets";

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

interface NormalizedWeightedKeyword {
  normalized: string;
  weight: number;
}

function countWeightedHits(
  normalizedText: string,
  weightedKeywords: NormalizedWeightedKeyword[]
): { totalWeight: number; uniqueKeywords: number; hits: number } {
  let totalWeight = 0;
  let hits = 0;
  let uniqueKeywords = 0;

  for (const wk of weightedKeywords) {
    if (!wk.normalized) continue;
    let found = false;
    let startIndex = 0;
    while (true) {
      const idx = normalizedText.indexOf(wk.normalized, startIndex);
      if (idx === -1) break;
      totalWeight += wk.weight;
      hits++;
      if (!found) { uniqueKeywords++; found = true; }
      startIndex = idx + wk.normalized.length;
    }
  }

  return { totalWeight, uniqueKeywords, hits };
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
  keywords: string[],
  weightedKeywords?: WeightedKeyword[]
): ClassificationResult {
  const normalizedKeywords = keywords.map(normalizeKeyword).filter(Boolean);
  const normalizedWeighted: NormalizedWeightedKeyword[] = weightedKeywords
    ? weightedKeywords.map((wk) => ({ normalized: normalizeKeyword(wk.keyword), weight: wk.weight }))
    : normalizedKeywords.map((nk) => ({ normalized: nk, weight: 1 }));

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

    if (normalizedWeighted.length === 0) {
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
    const { totalWeight, uniqueKeywords, hits } = countWeightedHits(normalizedText, normalizedWeighted);

    // Score formula: weighted hits normalized by text length
    // Require at least 2 unique keyword matches OR a high-weight keyword (weight >= 3)
    // to avoid noise from single generic hits on long pages
    let score = 0;
    if (totalWeight > 0) {
      const hasHighValueHit = normalizedWeighted.some(
        (wk) => wk.weight >= 3 && normalizedText.includes(wk.normalized) && wk.normalized.length > 0
      );
      if (uniqueKeywords >= 2 || hasHighValueHit) {
        // Weighted density: totalWeight / sqrt(textLength), boosted by keyword diversity
        const densityScore = totalWeight / Math.sqrt(Math.max(normalizedText.length, 1));
        const diversityBonus = Math.min(uniqueKeywords / 3, 2); // up to 2x for diverse matches
        score = densityScore * (1 + diversityBonus * 0.5);
      }
    }

    textPages.push({
      pageIndex: index,
      pageNumber: index + 1,
      pageType: "text",
      score,
      keywordHits: hits,
      textLength,
      textSnippet: extractSnippet(text, keywords),
      hasText: true,
    });
  }

  const avgCharsPerPage = totalPages > 0 ? totalChars / totalPages : 0;
  const isLikelyScanned = totalPages > 0 && avgCharsPerPage < 50;

  return { textPages, drawingPages, totalChars, totalPages, isLikelyScanned };
}

/**
 * Auto-calculate a threshold that separates signal from noise.
 * Uses percentile-based approach: keep only the top N% of scored pages.
 * For a 1300-page RFP, we expect ~3-8% to be relevant (40-100 pages).
 */
export function autoThreshold(textPages: PageScore[]): number {
  const scores = textPages.map((p) => p.score).filter((s) => s > 0).sort((a, b) => b - a);
  if (scores.length === 0) return 0.01;

  // Target: keep at most 10% of scored pages, minimum threshold at 60th percentile of non-zero scores
  const targetKeepCount = Math.max(10, Math.ceil(scores.length * 0.10));
  const cutoffScore = scores[Math.min(targetKeepCount - 1, scores.length - 1)];

  // Also compute a gap-based threshold: find the biggest score drop
  let maxGap = 0;
  let gapThreshold = cutoffScore;
  for (let i = 0; i < Math.min(scores.length - 1, targetKeepCount * 2); i++) {
    const gap = scores[i] - scores[i + 1];
    const relativeGap = scores[i] > 0 ? gap / scores[i] : 0;
    if (relativeGap > maxGap && relativeGap > 0.3) {
      maxGap = relativeGap;
      gapThreshold = (scores[i] + scores[i + 1]) / 2;
    }
  }

  // Use the higher of the two thresholds (more aggressive filtering)
  return Math.max(cutoffScore, gapThreshold, 0.05);
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
