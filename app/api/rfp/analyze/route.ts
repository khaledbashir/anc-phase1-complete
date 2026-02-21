/**
 * POST /api/rfp/analyze — Unified RFP Analysis
 *
 * Accepts multipart/form-data with one or more PDF files.
 * Returns full per-page analysis, LED specs, and project info.
 *
 * Query params:
 *   ?skipVision=true   — Skip Gemini vision (faster, text-only)
 *   ?threshold=50      — Minimum relevance score (0-100)
 *   ?maxPages=100      — Max pages to process
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeRfp } from "@/services/rfp/unified";

export const maxDuration = 300; // 5 min for large RFPs
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // Collect all uploaded files
    const files: Array<{ buffer: Buffer; filename: string }> = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        files.push({
          buffer: Buffer.from(arrayBuffer),
          filename: value.name || `file-${files.length}.pdf`,
        });
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files uploaded. Send one or more PDF files as multipart/form-data." },
        { status: 400 },
      );
    }

    // Parse options from query params
    const url = new URL(request.url);
    const skipVision = url.searchParams.get("skipVision") === "true";
    const threshold = parseInt(url.searchParams.get("threshold") || "0", 10);
    const maxPages = url.searchParams.has("maxPages")
      ? parseInt(url.searchParams.get("maxPages")!, 10)
      : undefined;

    // Run the unified pipeline
    const result = await analyzeRfp(files, {
      skipVision,
      relevanceThreshold: threshold,
      maxPages,
      generateThumbnails: false, // Thumbnails generated client-side
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[/api/rfp/analyze] Error:", err);
    return NextResponse.json(
      {
        error: `Analysis failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 500 },
    );
  }
}
