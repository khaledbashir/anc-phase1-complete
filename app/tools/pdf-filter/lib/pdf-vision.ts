import { DRAWING_CATEGORIES } from "./drawing-categories";

export interface DrawingAnalysisResult {
  pageIndex: number;
  pageNumber: number;
  category: string;
  categoryLabel: string;
  description: string;
  confidence: number;
}

export interface VisionBatchRequest {
  images: { pageIndex: number; pageNumber: number; base64: string }[];
  enabledCategories: string[];
  customInstructions: string;
}

export interface VisionProgress {
  completed: number;
  total: number;
  results: DrawingAnalysisResult[];
}

const BATCH_SIZE = 5;
const MAX_CONCURRENT = 3;

export function buildVisionPrompt(
  enabledCategories: string[],
  customInstructions: string
): string {
  const categoryList = DRAWING_CATEGORIES
    .filter((c) => enabledCategories.includes(c.id))
    .map((c) => `- ${c.id}: ${c.description}`)
    .join("\n");

  const allCategoryIds = DRAWING_CATEGORIES.map((c) => c.id).join(", ");

  return `You are analyzing construction/architectural drawings from an RFP document for an LED display installation company. For each drawing image provided, determine:

1. CATEGORY: One of [${allCategoryIds}, blank, other]
2. DESCRIPTION: One sentence describing what the drawing shows, focusing on relevance to LED display installation.
3. RELEVANCE: 0-100 confidence that this drawing is relevant to LED display installation scope.

Categories the user is looking for:
${categoryList}

${customInstructions ? `Additional context from user: ${customInstructions}` : ""}

Respond with a JSON array. Each element must have exactly these fields:
{"image_index": <0-based index matching input order>, "category": "<category_id>", "description": "<one sentence>", "confidence": <0-100>}

Return ONLY the JSON array, no other text.`;
}

export function estimateCost(
  drawingCount: number,
  model: "haiku" | "sonnet" = "haiku"
): { perImage: number; total: number; modelName: string } {
  const rates = {
    haiku: { perImage: 0.0005, modelName: "Claude Haiku" },
    sonnet: { perImage: 0.003, modelName: "Claude Sonnet" },
  };
  const rate = rates[model];
  return {
    perImage: rate.perImage,
    total: drawingCount * rate.perImage,
    modelName: rate.modelName,
  };
}

export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export async function analyzeDrawingBatch(
  batch: { pageIndex: number; pageNumber: number; base64: string }[],
  enabledCategories: string[],
  customInstructions: string
): Promise<DrawingAnalysisResult[]> {
  const response = await fetch("/api/tools/pdf-vision", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      images: batch.map((img) => ({
        pageIndex: img.pageIndex,
        pageNumber: img.pageNumber,
        base64: img.base64,
      })),
      enabledCategories,
      customInstructions,
    } satisfies VisionBatchRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Vision API failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.results as DrawingAnalysisResult[];
}

export async function analyzeAllDrawings(
  drawings: { pageIndex: number; pageNumber: number; base64: string }[],
  enabledCategories: string[],
  customInstructions: string,
  onProgress: (progress: VisionProgress) => void,
  signal?: AbortSignal
): Promise<DrawingAnalysisResult[]> {
  const batches = splitIntoBatches(drawings, BATCH_SIZE);
  const allResults: DrawingAnalysisResult[] = [];
  let completed = 0;

  const processBatch = async (
    batch: typeof drawings
  ): Promise<DrawingAnalysisResult[]> => {
    if (signal?.aborted) return [];
    try {
      return await analyzeDrawingBatch(
        batch,
        enabledCategories,
        customInstructions
      );
    } catch (err) {
      console.error("Batch failed:", err);
      return batch.map((img) => ({
        pageIndex: img.pageIndex,
        pageNumber: img.pageNumber,
        category: "other",
        categoryLabel: "Error",
        description: `Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
        confidence: 0,
      }));
    }
  };

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
    if (signal?.aborted) break;
    const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT);
    const waveResults = await Promise.all(concurrentBatches.map(processBatch));

    for (const batchResults of waveResults) {
      allResults.push(...batchResults);
      completed += batchResults.length;
    }

    onProgress({
      completed,
      total: drawings.length,
      results: [...allResults],
    });
  }

  return allResults;
}

export function splitDrawingsByConfidence(
  results: DrawingAnalysisResult[],
  enabledCategories: Set<string>
): { keep: DrawingAnalysisResult[]; discard: DrawingAnalysisResult[] } {
  const keep: DrawingAnalysisResult[] = [];
  const discard: DrawingAnalysisResult[] = [];

  for (const r of results) {
    const categoryEnabled = enabledCategories.has(r.category);
    if (categoryEnabled && r.confidence >= 70) {
      keep.push(r);
    } else if (!categoryEnabled || r.confidence < 30) {
      discard.push(r);
    } else {
      keep.push(r);
    }
  }

  keep.sort((a, b) => b.confidence - a.confidence);
  discard.sort((a, b) => a.confidence - b.confidence);

  return { keep, discard };
}
