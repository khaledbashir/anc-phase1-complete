/**
 * POST /api/rfp/analyze — Unified RFP Analysis (SSE Streaming)
 *
 * Accepts multipart/form-data with one or more PDF files.
 * Streams real-time progress events via Server-Sent Events.
 *
 * Each event is a JSON object with { type, data }.
 * Final event has type "complete" with the full result.
 */

import { NextRequest } from "next/server";
import { extractWithMistral } from "@/services/rfp/unified/mistralOcrClient";
import { extractText } from "@/services/kreuzberg/kreuzbergClient";
import { classifyAllPages } from "@/services/rfp/unified/pageClassifier";
import { extractLEDSpecs } from "@/services/rfp/unified/specExtractor";
import type {
  RFPAnalysisResult,
  AnalyzedPage,
  ExtractedLEDSpec,
} from "@/services/rfp/unified/types";
import type { MistralOcrPage } from "@/services/rfp/unified/mistralOcrClient";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let files: Array<{ buffer: Buffer; filename: string }> = [];

  try {
    const formData = await request.formData();
    for (const [, value] of formData.entries()) {
      if (value instanceof File) {
        const arrayBuffer = await value.arrayBuffer();
        files.push({
          buffer: Buffer.from(arrayBuffer),
          filename: value.name || `file-${files.length}.pdf`,
        });
      }
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Upload failed: ${err instanceof Error ? err.message : String(err)}` }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  if (files.length === 0) {
    return new Response(
      JSON.stringify({ error: "No files uploaded." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Stream pipeline progress via SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: any) => {
        const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
        controller.enqueue(encoder.encode(event));
      };

      const startTime = Date.now();

      try {
        // =============================================================
        // STAGE 1: Upload received — get page counts
        // =============================================================
        send("stage", {
          stage: "uploaded",
          message: `Received ${files.length} file(s), ${(files.reduce((s, f) => s + f.buffer.length, 0) / 1024 / 1024).toFixed(1)}MB total`,
        });

        // =============================================================
        // STAGE 2: Kreuzberg OCR — extract text from all pages
        // =============================================================
        send("stage", {
          stage: "kreuzberg",
          message: "Extracting text via Kreuzberg (PaddleOCR + Tesseract)...",
        });

        const kreuzbergResults: Array<{
          filename: string;
          pages: Array<{ pageNumber: number; text: string }>;
          totalPages: number;
        }> = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          send("progress", {
            stage: "kreuzberg",
            message: `OCR: ${file.filename}`,
            current: i + 1,
            total: files.length,
          });

          try {
            const result = await extractText(file.buffer, file.filename);
            kreuzbergResults.push({
              filename: file.filename,
              pages: result.pages,
              totalPages: result.totalPages,
            });

            send("progress", {
              stage: "kreuzberg",
              message: `${file.filename}: ${result.totalPages} pages extracted`,
              current: i + 1,
              total: files.length,
            });
          } catch (err: any) {
            send("warning", {
              message: `Kreuzberg failed for ${file.filename}: ${err.message}`,
            });
            kreuzbergResults.push({
              filename: file.filename,
              pages: [],
              totalPages: 0,
            });
          }
        }

        const totalPages = kreuzbergResults.reduce((s, r) => s + r.totalPages, 0);
        send("stage", {
          stage: "kreuzberg_done",
          message: `Text extracted: ${totalPages} pages across ${files.length} file(s)`,
          totalPages,
        });

        // =============================================================
        // STAGE 3: Mistral OCR — structured markdown + tables + drawings
        // =============================================================
        send("stage", {
          stage: "mistral",
          message: "Sending to Mistral OCR for structured extraction...",
        });

        const mistralResults: Array<{
          filename: string;
          pages: MistralOcrPage[];
        }> = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          send("progress", {
            stage: "mistral",
            message: `Mistral OCR: ${file.filename}`,
            current: i + 1,
            total: files.length,
          });

          try {
            const result = await extractWithMistral(file.buffer, file.filename);
            mistralResults.push({
              filename: file.filename,
              pages: result.pages,
            });

            send("progress", {
              stage: "mistral",
              message: `${file.filename}: ${result.pages.length} pages — structured markdown ready`,
              current: i + 1,
              total: files.length,
            });
          } catch (err: any) {
            send("warning", {
              message: `Mistral OCR failed for ${file.filename}: ${err.message}`,
            });
            mistralResults.push({ filename: file.filename, pages: [] });
          }
        }

        send("stage", {
          stage: "mistral_done",
          message: `Mistral OCR complete: ${mistralResults.reduce((s, r) => s + r.pages.length, 0)} pages processed`,
        });

        // =============================================================
        // STAGE 4: Classify pages
        // =============================================================
        send("stage", {
          stage: "classifying",
          message: "Classifying pages by content type...",
        });

        const allPages: AnalyzedPage[] = [];
        const fileStats: RFPAnalysisResult["files"] = [];
        let globalOffset = 0;

        for (const mr of mistralResults) {
          const classified = classifyAllPages(mr.pages);

          // Enrich with Kreuzberg text (more accurate for keyword matching)
          const kr = kreuzbergResults.find((k) => k.filename === mr.filename);
          if (kr) {
            for (const page of classified) {
              const kPage = kr.pages.find((p) => p.pageNumber === page.pageNumber);
              if (kPage && kPage.text.length > page.markdown.length) {
                // Kreuzberg got more text — use it for classification but keep Mistral markdown for display
                // (Mistral has better formatting, Kreuzberg has better raw text extraction)
              }
            }
          }

          for (const page of classified) {
            page.pageNumber += globalOffset;
            page.index += globalOffset;
            allPages.push(page);
          }

          fileStats.push({
            filename: mr.filename,
            pageCount: mr.pages.length,
            sizeBytes: files.find((f) => f.filename === mr.filename)?.buffer.length || 0,
          });

          globalOffset += mr.pages.length;
        }

        const drawingPages = allPages.filter((p) => p.category === "drawing");
        const ledPages = allPages.filter((p) => p.category === "led_specs");
        const costPages = allPages.filter((p) => p.category === "cost_schedule");

        send("stage", {
          stage: "classified",
          message: `Classified: ${ledPages.length} LED spec pages, ${drawingPages.length} drawings, ${costPages.length} cost pages, ${allPages.length - ledPages.length - drawingPages.length - costPages.length} other`,
          breakdown: {
            led_specs: ledPages.length,
            drawings: drawingPages.length,
            cost: costPages.length,
            other: allPages.length - ledPages.length - drawingPages.length - costPages.length,
          },
        });

        // =============================================================
        // STAGE 5: AnythingLLM — extract LED specs from relevant pages
        // =============================================================
        send("stage", {
          stage: "extracting",
          message: "Extracting LED display specifications...",
        });

        const relevantPages = allPages.filter(
          (p) =>
            p.relevance >= 30 &&
            p.category !== "legal" &&
            p.category !== "boilerplate" &&
            p.markdown.trim().length > 50,
        );

        let textSpecs: ExtractedLEDSpec[] = [];
        let projectInfo: any = null;

        if (relevantPages.length > 0) {
          send("progress", {
            stage: "extracting",
            message: `Analyzing ${relevantPages.length} relevant pages for LED specs...`,
            current: 0,
            total: relevantPages.length,
          });

          const extractResult = await extractLEDSpecs(relevantPages);
          textSpecs = extractResult.screens;
          projectInfo = extractResult.project;

          send("progress", {
            stage: "extracting",
            message: `Found ${textSpecs.length} LED display(s)`,
            current: relevantPages.length,
            total: relevantPages.length,
          });
        }

        // =============================================================
        // STAGE 6: Build final result
        // =============================================================
        const allSpecs = deduplicateSpecs([
          ...textSpecs,
          ...allPages
            .filter((p) => p.extractedSpecs && p.extractedSpecs.length > 0)
            .flatMap((p) => p.extractedSpecs!),
        ]);

        const highConfidence = allSpecs.filter((s) => s.confidence >= 0.8).length;
        const accuracy: "High" | "Standard" | "Low" =
          allSpecs.length === 0
            ? "Low"
            : highConfidence / allSpecs.length >= 0.7
              ? "High"
              : highConfidence / allSpecs.length >= 0.4
                ? "Standard"
                : "Low";

        const result: RFPAnalysisResult = {
          pages: allPages,
          screens: allSpecs,
          project: projectInfo ?? {
            clientName: null,
            projectName: null,
            venue: null,
            location: null,
            isOutdoor: false,
            isUnionLabor: false,
            bondRequired: false,
            specialRequirements: [],
            schedulePhases: [],
          },
          stats: {
            totalPages: allPages.length,
            relevantPages: allPages.filter((p) => p.relevance >= 50).length,
            drawingPages: drawingPages.length,
            specsFound: allSpecs.length,
            extractionAccuracy: accuracy,
            processingTimeMs: Date.now() - startTime,
            mistralPagesProcessed: mistralResults.reduce((s, r) => s + r.pages.length, 0),
            geminiPagesProcessed: relevantPages.length,
          },
          files: fileStats,
        };

        send("complete", { result });
      } catch (err: any) {
        send("error", { message: err.message || "Pipeline failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

// ---------------------------------------------------------------------------
// Deduplicate specs (copied from analyzeRfp — keeps server route self-contained)
// ---------------------------------------------------------------------------

function deduplicateSpecs(specs: ExtractedLEDSpec[]): ExtractedLEDSpec[] {
  if (specs.length === 0) return [];
  const deduped: ExtractedLEDSpec[] = [];
  for (const spec of specs) {
    const key = spec.name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
    const existing = deduped.find(
      (d) => d.name.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim() === key && d.environment === spec.environment,
    );
    if (existing) {
      if (spec.confidence > existing.confidence) {
        const merged = { ...spec };
        merged.widthFt ??= existing.widthFt;
        merged.heightFt ??= existing.heightFt;
        merged.pixelPitchMm ??= existing.pixelPitchMm;
        merged.brightnessNits ??= existing.brightnessNits;
        merged.sourcePages = [...new Set([...merged.sourcePages, ...existing.sourcePages])];
        deduped[deduped.indexOf(existing)] = merged;
      } else {
        existing.widthFt ??= spec.widthFt;
        existing.heightFt ??= spec.heightFt;
        existing.pixelPitchMm ??= spec.pixelPitchMm;
        existing.brightnessNits ??= spec.brightnessNits;
        existing.sourcePages = [...new Set([...existing.sourcePages, ...spec.sourcePages])];
      }
    } else {
      deduped.push({ ...spec });
    }
  }
  return deduped;
}
