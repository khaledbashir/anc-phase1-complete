/**
 * POST /api/rfp/analyze — Unified RFP Analysis (Automatic Pipeline)
 *
 * The user uploads a PDF. Everything else is automatic:
 *   1. Kreuzberg OCR → fast text extraction (all pages)
 *   2. Classify + triage → keep relevant, kill noise
 *   3. Mistral OCR → structured markdown on relevant pages only
 *   4. AI → extract LED specs from structured content
 *
 * Streams real-time progress via SSE. User sees stages updating,
 * then gets clean results at the end.
 *
 * Accepts: sessionId from /api/rfp/analyze/upload
 */

import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { extractText } from "@/services/kreuzberg/kreuzbergClient";
import { extractWithMistral } from "@/services/rfp/unified/mistralOcrClient";
import { extractLEDSpecs } from "@/services/rfp/unified/specExtractor";
import type {
  RFPAnalysisResult,
  AnalyzedPage,
  ExtractedLEDSpec,
  PageCategory,
} from "@/services/rfp/unified/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/tmp/rfp-uploads";

// Keyword banks
const LED_KEYWORDS = [
  "led", "display", "videoboard", "video board", "ribbon", "fascia",
  "scoreboard", "pixel pitch", "nits", "brightness", "resolution",
  "cabinet", "module", "11 06 60", "11 63 10", "display schedule",
  "screen", "marquee", "dvled", "direct view", "viewing distance",
];

const NOISE_KEYWORDS = [
  "insurance", "indemnif", "liability", "warranty", "bond",
  "liquidated damages", "termination", "dispute", "arbitration",
  "terms and conditions", "general conditions", "table of contents",
  "appendix", "certification", "biography", "qualifications",
  "references", "company profile",
];

export async function POST(request: NextRequest) {
  let body: { sessionId: string; filename?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON — send { sessionId }" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const filePath = path.join(UPLOAD_DIR, `${body.sessionId}.pdf`);
  if (!existsSync(filePath)) {
    return new Response(JSON.stringify({ error: "Session not found. Upload first." }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`));
      };

      const startTime = Date.now();

      try {
        // =============================================================
        // STEP 1: Read file
        // =============================================================
        send("stage", { stage: "reading", message: "Loading PDF..." });
        const buffer = await readFile(filePath);
        const sizeMb = (buffer.length / 1024 / 1024).toFixed(1);

        // =============================================================
        // STEP 2: Kreuzberg OCR — fast text extraction (ALL pages)
        // =============================================================
        send("stage", {
          stage: "ocr",
          message: `Extracting text from all pages (${sizeMb}MB)...`,
          detail: "Kreuzberg: PaddleOCR + Tesseract",
        });

        const ocrResult = await extractText(buffer, body.filename || "document.pdf");

        send("stage", {
          stage: "ocr_done",
          message: `${ocrResult.totalPages.toLocaleString()} pages scanned`,
          totalPages: ocrResult.totalPages,
          totalChars: ocrResult.text.length,
        });

        // =============================================================
        // STEP 3: Classify + triage — kill the noise
        // =============================================================
        send("stage", {
          stage: "triaging",
          message: `Filtering ${ocrResult.totalPages.toLocaleString()} pages — keeping only relevant content...`,
        });

        const classifiedPages: Array<{
          pageNumber: number;
          text: string;
          category: PageCategory;
          relevance: number;
          isDrawing: boolean;
          ledScore: number;
        }> = [];

        for (const page of ocrResult.pages) {
          const text = page.text.toLowerCase();
          const textLength = page.text.trim().length;
          const isDrawing = textLength < 150;

          // Score LED relevance
          let ledScore = 0;
          for (const kw of LED_KEYWORDS) {
            if (text.includes(kw)) ledScore++;
          }

          // Score noise
          let noiseScore = 0;
          for (const kw of NOISE_KEYWORDS) {
            if (text.includes(kw)) noiseScore++;
          }

          // Classify
          let category: PageCategory = "unknown";
          let relevance = 20;

          if (isDrawing) {
            category = "drawing";
            relevance = 60;
          } else if (ledScore >= 2) {
            category = "led_specs";
            relevance = Math.min(100, 70 + ledScore * 5);
          } else if (ledScore === 1 && noiseScore === 0) {
            category = "technical";
            relevance = 50;
          } else if (noiseScore >= 3) {
            category = "legal";
            relevance = 5;
          } else if (textLength < 100) {
            category = "boilerplate";
            relevance = 5;
          } else if (text.includes("scope of work") || text.includes("shall provide")) {
            category = "scope_of_work";
            relevance = 55;
          } else if (text.includes("cost") || text.includes("price") || text.includes("bid")) {
            category = "cost_schedule";
            relevance = 45;
          }

          classifiedPages.push({
            pageNumber: page.pageNumber,
            text: page.text,
            category,
            relevance,
            isDrawing,
            ledScore,
          });
        }

        // Keep pages with relevance >= 40
        const relevantPages = classifiedPages.filter((p) => p.relevance >= 40);
        const noisePages = classifiedPages.filter((p) => p.relevance < 40);

        send("stage", {
          stage: "triaged",
          message: `Kept ${relevantPages.length} relevant pages, filtered out ${noisePages.length} noise pages`,
          relevant: relevantPages.length,
          noise: noisePages.length,
          led: relevantPages.filter((p) => p.category === "led_specs").length,
          drawings: relevantPages.filter((p) => p.isDrawing).length,
        });

        // =============================================================
        // STEP 4: Mistral OCR — structured extraction (relevant pages ONLY)
        // =============================================================

        let mistralPages: AnalyzedPage[] = [];

        if (relevantPages.length > 0) {
          send("stage", {
            stage: "vision",
            message: `Sending ${relevantPages.length} pages to Mistral OCR for structured extraction...`,
            detail: "Tables, markdown, images, headers",
          });

          // Build a smaller PDF with only relevant pages
          const { PDFDocument } = await import("pdf-lib");
          const srcDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const filteredDoc = await PDFDocument.create();

          for (const rp of relevantPages) {
            const idx = rp.pageNumber - 1;
            if (idx >= 0 && idx < srcDoc.getPageCount()) {
              const [copiedPage] = await filteredDoc.copyPages(srcDoc, [idx]);
              filteredDoc.addPage(copiedPage);
            }
          }

          const filteredBuffer = Buffer.from(await filteredDoc.save());

          send("progress", {
            stage: "vision",
            message: `Built ${relevantPages.length}-page PDF (${(filteredBuffer.length / 1024 / 1024).toFixed(1)}MB) — sending to Mistral OCR...`,
          });

          try {
            const mistralResult = await extractWithMistral(filteredBuffer, "relevant-pages.pdf");

            mistralPages = mistralResult.pages.map((mp, i) => ({
              index: i,
              pageNumber: relevantPages[i]?.pageNumber || i + 1,
              category: relevantPages[i]?.category || "unknown",
              relevance: relevantPages[i]?.relevance || 50,
              markdown: mp.markdown,
              tables: mp.tables,
              visionAnalyzed: true,
              summary: mp.markdown.split("\n").find((l) => l.trim().length > 10)?.slice(0, 150) || "",
              classifiedBy: "mistral-ocr" as const,
            }));

            send("stage", {
              stage: "vision_done",
              message: `Mistral OCR extracted structured content from ${mistralPages.length} pages`,
              tables: mistralPages.reduce((s, p) => s + p.tables.length, 0),
            });
          } catch (err: any) {
            send("warning", {
              message: `Mistral OCR failed: ${err.message}. Falling back to Kreuzberg text.`,
            });

            // Fallback: use Kreuzberg text as markdown
            mistralPages = relevantPages.map((rp, i) => ({
              index: i,
              pageNumber: rp.pageNumber,
              category: rp.category,
              relevance: rp.relevance,
              markdown: rp.text,
              tables: [],
              visionAnalyzed: false,
              summary: rp.text.split("\n").find((l) => l.trim().length > 10)?.slice(0, 150) || "",
              classifiedBy: "text-heuristic" as const,
            }));
          }
        }

        // =============================================================
        // STEP 5: AI extraction — pull LED specs
        // =============================================================

        let screens: ExtractedLEDSpec[] = [];
        let projectInfo: any = null;

        if (mistralPages.length > 0) {
          send("stage", {
            stage: "extracting",
            message: `AI analyzing ${mistralPages.length} pages for LED display specifications...`,
          });

          const result = await extractLEDSpecs(mistralPages);
          screens = result.screens;
          projectInfo = result.project;

          send("stage", {
            stage: "extracted",
            message: `Found ${screens.length} LED display(s)`,
            specsFound: screens.length,
          });
        }

        // =============================================================
        // STEP 6: Build final result
        // =============================================================

        const processingTime = Date.now() - startTime;

        send("complete", {
          result: {
            screens,
            project: projectInfo ?? {
              clientName: null, projectName: null, venue: null, location: null,
              isOutdoor: false, isUnionLabor: false, bondRequired: false,
              specialRequirements: [], schedulePhases: [],
            },
            pages: mistralPages,
            stats: {
              totalPages: ocrResult.totalPages,
              relevantPages: relevantPages.length,
              noisePages: noisePages.length,
              drawingPages: classifiedPages.filter((p) => p.isDrawing).length,
              specsFound: screens.length,
              processingTimeMs: processingTime,
            },
            triage: classifiedPages.map((p) => ({
              pageNumber: p.pageNumber,
              category: p.category,
              relevance: p.relevance,
              isDrawing: p.isDrawing,
            })),
          },
        });
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
