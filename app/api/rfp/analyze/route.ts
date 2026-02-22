/**
 * POST /api/rfp/analyze — RFP Analysis Pipeline
 *
 * 1. Kreuzberg OCR → fast text from ALL pages (cheap, local)
 * 2. Keyword triage → generous filter, keeps anything remotely relevant
 * 3. Convert relevant pages to JPEG images (pdftoppm)
 * 4. Queue each image through Mistral OCR — vision model SEES the page
 * 5. Batched AI extraction → LED specs from vision results
 *
 * Streams real-time progress via SSE.
 */

import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { extractText } from "@/services/kreuzberg/kreuzbergClient";
import { extractSinglePage } from "@/services/rfp/unified/mistralOcrClient";
import { extractLEDSpecsBatched } from "@/services/rfp/unified/specExtractor";
import { convertPageToImage } from "@/services/rfp/unified/pdfToImages";
import type {
  AnalyzedPage,
  ExtractedLEDSpec,
  PageCategory,
} from "@/services/rfp/unified/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

const UPLOAD_DIR = "/tmp/rfp-uploads";

// ---------------------------------------------------------------------------
// Keyword banks
// ---------------------------------------------------------------------------

const LED_KEYWORDS = [
  "led", "display", "videoboard", "video board", "ribbon", "fascia",
  "scoreboard", "pixel pitch", "nits", "brightness", "resolution",
  "cabinet", "module", "11 06 60", "11 63 10", "display schedule",
  "screen", "marquee", "dvled", "direct view", "viewing distance",
  "division 11", "signage", "digital display", "av system", "audio visual",
  "video wall", "media mesh", "transparent led", "led panel", "led screen",
];

const SUPPORTING_KEYWORDS = [
  "electrical", "power distribution", "conduit", "raceway", "control system",
  "mounting", "structural", "steel frame", "rigging", "catenary",
  "scope of work", "shall provide", "shall furnish", "shall install",
  "cost", "price", "bid", "schedule of values",
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

  const imageDir = path.join(UPLOAD_DIR, body.sessionId);

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
        // STEP 2: Kreuzberg OCR — fast text (ALL pages, cheap)
        // =============================================================
        send("stage", {
          stage: "ocr",
          message: `Extracting text from all pages (${sizeMb}MB)...`,
        });

        const ocrResult = await extractText(buffer, body.filename || "document.pdf");

        send("stage", {
          stage: "ocr_done",
          message: `${ocrResult.totalPages.toLocaleString()} pages scanned`,
          totalPages: ocrResult.totalPages,
          totalChars: ocrResult.text.length,
        });

        // =============================================================
        // STEP 3: Keyword triage — generous, keeps anything relevant
        // =============================================================
        send("stage", {
          stage: "triaging",
          message: `Classifying ${ocrResult.totalPages.toLocaleString()} pages...`,
        });

        const classifiedPages: Array<{
          pageNumber: number;
          text: string;
          category: PageCategory;
          relevance: number;
          isDrawing: boolean;
        }> = [];

        for (const page of ocrResult.pages) {
          const text = page.text.toLowerCase();
          const textLength = page.text.trim().length;
          const isDrawing = textLength < 150;

          let ledScore = 0;
          for (const kw of LED_KEYWORDS) {
            if (text.includes(kw)) ledScore++;
          }

          let supportScore = 0;
          for (const kw of SUPPORTING_KEYWORDS) {
            if (text.includes(kw)) supportScore++;
          }

          let noiseScore = 0;
          for (const kw of NOISE_KEYWORDS) {
            if (text.includes(kw)) noiseScore++;
          }

          let category: PageCategory = "unknown";
          let relevance = 10;

          if (isDrawing) {
            category = "drawing";
            relevance = 50;
          } else if (ledScore >= 2) {
            category = "led_specs";
            relevance = Math.min(100, 70 + ledScore * 5);
          } else if (ledScore === 1) {
            category = noiseScore === 0 ? "technical" : "unknown";
            relevance = 40 + supportScore * 5;
          } else if (supportScore >= 2 && noiseScore === 0) {
            category = text.includes("scope of work") || text.includes("shall provide") ? "scope_of_work" : "technical";
            relevance = 30 + supportScore * 5;
          } else if (noiseScore >= 3) {
            category = "legal";
            relevance = 5;
          } else if (textLength < 100) {
            category = "boilerplate";
            relevance = 5;
          } else if (text.includes("scope of work") || text.includes("shall provide")) {
            category = "scope_of_work";
            relevance = 35;
          } else if (text.includes("cost") || text.includes("price") || text.includes("bid")) {
            category = "cost_schedule";
            relevance = 25;
          }

          classifiedPages.push({ pageNumber: page.pageNumber, text: page.text, category, relevance, isDrawing });
        }

        const relevantPages = classifiedPages.filter((p) => p.relevance >= 20);
        const noisePages = classifiedPages.filter((p) => p.relevance < 20);

        send("stage", {
          stage: "triaged",
          message: `Kept ${relevantPages.length} pages, filtered ${noisePages.length}`,
          relevant: relevantPages.length,
          noise: noisePages.length,
          led: relevantPages.filter((p) => p.category === "led_specs").length,
          drawings: relevantPages.filter((p) => p.isDrawing).length,
        });

        // =============================================================
        // STEP 4: Convert relevant pages to JPEG images
        // =============================================================

        const mistralPages: AnalyzedPage[] = [];

        if (relevantPages.length > 0) {
          send("stage", {
            stage: "converting",
            message: `Converting ${relevantPages.length} pages to images...`,
          });

          // Convert each page to JPEG + send to Mistral in sequence
          // This way we don't store all images at once either
          send("stage", {
            stage: "vision",
            message: `Vision model reading ${relevantPages.length} pages...`,
          });

          for (let i = 0; i < relevantPages.length; i++) {
            const rp = relevantPages[i];

            send("progress", {
              stage: "vision",
              current: i + 1,
              total: relevantPages.length,
              message: `Page ${rp.pageNumber} — converting to image & reading (${i + 1}/${relevantPages.length})`,
            });

            try {
              // Convert this page to JPEG
              const pageDir = path.join(imageDir, `p${rp.pageNumber}`);
              const imagePath = await convertPageToImage(filePath, rp.pageNumber, pageDir);

              // Send JPEG to Mistral OCR — vision model SEES the image
              const ocrPage = await extractSinglePage(imagePath, rp.pageNumber);

              mistralPages.push({
                index: i,
                pageNumber: rp.pageNumber,
                category: rp.category,
                relevance: rp.relevance,
                markdown: ocrPage.markdown,
                tables: ocrPage.tables.map((t) => ({
                  id: t.id,
                  content: t.content,
                  format: t.format,
                })),
                visionAnalyzed: true,
                summary: ocrPage.markdown.split("\n").find((l) => l.trim().length > 10)?.slice(0, 150) || "",
                classifiedBy: "mistral-ocr" as const,
              });
            } catch (err: any) {
              console.error(`[Pipeline] Page ${rp.pageNumber} failed:`, err.message);

              // Fallback: use Kreuzberg text
              mistralPages.push({
                index: i,
                pageNumber: rp.pageNumber,
                category: rp.category,
                relevance: rp.relevance,
                markdown: rp.text,
                tables: [],
                visionAnalyzed: false,
                summary: rp.text.split("\n").find((l) => l.trim().length > 10)?.slice(0, 150) || "",
                classifiedBy: "text-heuristic" as const,
              });

              send("warning", {
                message: `Page ${rp.pageNumber}: vision failed, using text fallback`,
              });
            }
          }

          send("stage", {
            stage: "vision_done",
            message: `Vision model processed ${mistralPages.length} pages`,
            pagesProcessed: mistralPages.length,
            visionSuccess: mistralPages.filter((p) => p.visionAnalyzed).length,
            tables: mistralPages.reduce((s, p) => s + p.tables.length, 0),
          });
        }

        // =============================================================
        // STEP 5: Batched AI extraction
        // =============================================================

        let screens: ExtractedLEDSpec[] = [];
        let projectInfo: any = null;

        if (mistralPages.length > 0) {
          send("stage", {
            stage: "extracting",
            message: `AI extracting LED specs from ${mistralPages.length} pages...`,
          });

          const result = await extractLEDSpecsBatched(
            mistralPages,
            (batch, totalBatches) => {
              send("progress", {
                stage: "extracting",
                current: batch,
                total: totalBatches,
                message: `Extraction batch ${batch}/${totalBatches}...`,
              });
            },
          );

          screens = result.screens;
          projectInfo = result.project;

          send("stage", {
            stage: "extracted",
            message: `Found ${screens.length} LED display(s)`,
            specsFound: screens.length,
          });
        }

        // =============================================================
        // STEP 6: Done
        // =============================================================

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
              processingTimeMs: Date.now() - startTime,
              visionPagesProcessed: mistralPages.filter((p) => p.visionAnalyzed).length,
            },
            triage: classifiedPages.map((p) => ({
              pageNumber: p.pageNumber,
              category: p.category,
              relevance: p.relevance,
              isDrawing: p.isDrawing,
            })),
          },
        });

        // Cleanup images (fire and forget)
        try {
          const { rm } = await import("fs/promises");
          await rm(imageDir, { recursive: true, force: true });
        } catch { /* ignore */ }
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
