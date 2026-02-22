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
import { stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { extractSinglePage } from "@/services/rfp/unified/mistralOcrClient";
import { extractLEDSpecsBatched } from "@/services/rfp/unified/specExtractor";
import { convertPageToImage } from "@/services/rfp/unified/pdfToImages";
import { provisionRfpWorkspace } from "@/services/rfp/unified/rfpWorkspaceProvisioner";
import { ensureAnythingLlmUser } from "@/services/anythingllm/userProvisioner";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const execFileAsync = promisify(execFile);
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

// STRONG LED signals — terms that ONLY appear on LED display pages
const LED_STRONG = [
  "led", "videoboard", "video board", "ribbon board", "fascia board",
  "scoreboard", "pixel pitch", "nits", "brightness",
  "dvled", "direct view", "viewing distance", "led panel", "led screen",
  "video wall", "media mesh", "transparent led", "led display",
  "11 06 60", "11 63 10", "display schedule",
  "pixel", "candela", "led module", "led cabinet",
];

// WEAK LED signals — appear on LED pages BUT also on non-LED pages
// Only count these if a STRONG signal is also present
const LED_WEAK = [
  "display", "screen", "marquee", "signage", "digital display",
  "resolution", "cabinet", "module", "av system", "audio visual",
  "division 11",
];

const SUPPORTING_KEYWORDS = [
  "mounting", "structural", "steel frame", "rigging", "catenary",
  "control system", "signal processing", "video processor",
];

const NOISE_KEYWORDS = [
  "insurance", "indemnif", "liability", "warranty", "bond",
  "liquidated damages", "termination", "dispute", "arbitration",
  "terms and conditions", "general conditions", "table of contents",
  "appendix", "certification", "biography", "qualifications",
  "references", "company profile", "leed", "leed certification",
  "fire alarm", "plumbing", "hvac", "mechanical", "elevator",
  "landscaping", "concrete", "masonry", "roofing", "flooring",
  "painting", "drywall", "insulation", "waterproofing",
];

export async function POST(request: NextRequest) {
  // Resolve authenticated user's AnythingLLM ID
  let anythingLlmUserId: number | null = null;
  const session = await auth();
  if (session?.user?.id && session?.user?.email) {
    anythingLlmUserId = await ensureAnythingLlmUser(session.user.id, session.user.email).catch(() => null);
  }

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
        // STEP 1: Get file info
        // =============================================================
        send("stage", { stage: "reading", message: "Loading PDF..." });
        const fileStat = await stat(filePath);
        const sizeMb = (fileStat.size / 1024 / 1024).toFixed(1);

        // =============================================================
        // STEP 2: Local pdftotext — extract text from ALL pages
        // Uses poppler-utils CLI, reads from disk, zero memory in Node.js.
        // No network transfer (unlike Kreuzberg which chokes on 631MB).
        // =============================================================
        send("stage", {
          stage: "ocr",
          message: `Extracting text from all pages (${sizeMb}MB)...`,
        });

        // Get page count
        let totalPages = 0;
        try {
          const { stdout: info } = await execFileAsync("pdfinfo", [filePath], { timeout: 30_000 });
          const match = info.match(/Pages:\s+(\d+)/);
          totalPages = match ? parseInt(match[1], 10) : 0;
        } catch {
          totalPages = 0;
        }

        if (totalPages === 0) {
          send("error", { message: "Could not read PDF page count" });
          return;
        }

        // Extract text per page using pdftotext (poppler-utils)
        // -f N -l N = single page, - = stdout
        const ocrPages: Array<{ pageNumber: number; text: string }> = [];
        let totalChars = 0;

        for (let p = 1; p <= totalPages; p++) {
          try {
            const { stdout: pageText } = await execFileAsync(
              "pdftotext",
              ["-f", String(p), "-l", String(p), "-layout", filePath, "-"],
              { timeout: 10_000, maxBuffer: 1024 * 1024 }, // 1MB per page max
            );
            ocrPages.push({ pageNumber: p, text: pageText });
            totalChars += pageText.length;
          } catch {
            // Page failed — push empty (will be filtered as low-relevance)
            ocrPages.push({ pageNumber: p, text: "" });
          }

          // Progress every 100 pages
          if (p % 100 === 0 || p === totalPages) {
            send("progress", {
              stage: "ocr",
              current: p,
              total: totalPages,
              message: `Text extraction: ${p.toLocaleString()}/${totalPages.toLocaleString()} pages`,
            });
          }
        }

        const ocrResult = { totalPages, text: "", pages: ocrPages };

        send("stage", {
          stage: "ocr_done",
          message: `${totalPages.toLocaleString()} pages scanned`,
          totalPages,
          totalChars,
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

          // Count STRONG LED signals (terms that only appear on LED pages)
          let strongLedScore = 0;
          for (const kw of LED_STRONG) {
            if (text.includes(kw)) strongLedScore++;
          }

          // Count WEAK LED signals (generic terms like "display", "screen")
          let weakLedScore = 0;
          for (const kw of LED_WEAK) {
            if (text.includes(kw)) weakLedScore++;
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
          let relevance = 5;

          // STRICT triage. A 1380-page RFP has maybe 30-80 LED-relevant pages.
          // We MUST filter aggressively or Mistral OCR costs go through the roof.
          //
          // Rule: only keep pages with STRONG LED signals.
          // Generic words like "display" or "screen" alone don't count.

          if (isDrawing) {
            // Drawings: only keep if they mention LED-specific terms
            category = "drawing";
            relevance = strongLedScore >= 1 ? 70 : 5;
          } else if (strongLedScore >= 3) {
            // Multiple strong signals — definitely an LED spec page
            category = "led_specs";
            relevance = Math.min(100, 85 + strongLedScore * 3);
          } else if (strongLedScore >= 2) {
            // Two strong signals — very likely relevant
            category = "led_specs";
            relevance = 75;
          } else if (strongLedScore >= 1 && weakLedScore >= 1) {
            // One strong + one weak — likely relevant
            category = "led_specs";
            relevance = 65;
          } else if (strongLedScore >= 1 && supportScore >= 1 && noiseScore === 0) {
            // One strong + supporting technical context, no noise
            category = "technical";
            relevance = 55;
          } else if (noiseScore >= 2) {
            category = "legal";
            relevance = 5;
          } else if (textLength < 100) {
            category = "boilerplate";
            relevance = 5;
          } else {
            // No strong LED signal → noise. Period.
            // This is the key change: weak signals alone (display, screen, module)
            // do NOT qualify a page. There must be at least 1 STRONG signal.
            category = "unknown";
            relevance = 5;
          }

          classifiedPages.push({ pageNumber: page.pageNumber, text: page.text, category, relevance, isDrawing });
        }

        // Threshold: 50+ = relevant. STRICT. Should yield 30-80 pages from a 1380-page RFP.
        const MAX_VISION_PAGES = 100; // Hard cap — never send more than this to Mistral
        let relevantPages = classifiedPages
          .filter((p) => p.relevance >= 50)
          .sort((a, b) => b.relevance - a.relevance); // Best pages first

        const totalRelevant = relevantPages.length;
        if (relevantPages.length > MAX_VISION_PAGES) {
          relevantPages = relevantPages.slice(0, MAX_VISION_PAGES);
        }

        const noisePages = classifiedPages.filter((p) => p.relevance < 50);

        send("stage", {
          stage: "triaged",
          message: totalRelevant > MAX_VISION_PAGES
            ? `Found ${totalRelevant} relevant pages, capped to top ${MAX_VISION_PAGES} by relevance`
            : `Kept ${relevantPages.length} pages, filtered ${noisePages.length}`,
          relevant: relevantPages.length,
          noise: noisePages.length,
          led: relevantPages.filter((p) => p.category === "led_specs").length,
          drawings: relevantPages.filter((p) => p.isDrawing).length,
          capped: totalRelevant > MAX_VISION_PAGES,
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
        let requirements: any[] = [];

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
          requirements = result.requirements;

          send("stage", {
            stage: "extracted",
            message: `Found ${screens.length} LED display(s), ${requirements.length} requirement(s)`,
            specsFound: screens.length,
            requirementsFound: requirements.length,
          });
        }

        // =============================================================
        // STEP 6: Done
        // =============================================================

        const finalProject = projectInfo ?? {
          clientName: null, projectName: null, venue: null, location: null,
          isOutdoor: false, isUnionLabor: false, bondRequired: false,
          specialRequirements: [], schedulePhases: [],
        };

        const finalStats = {
          totalPages: ocrResult.totalPages,
          relevantPages: relevantPages.length,
          noisePages: noisePages.length,
          drawingPages: classifiedPages.filter((p) => p.isDrawing).length,
          specsFound: screens.length,
          processingTimeMs: Date.now() - startTime,
          visionPagesProcessed: mistralPages.filter((p) => p.visionAnalyzed).length,
        };

        const triageData = classifiedPages.map((p) => ({
          pageNumber: p.pageNumber,
          category: p.category,
          relevance: p.relevance,
          isDrawing: p.isDrawing,
        }));

        // Save to database (fire and forget — don't block the response)
        let analysisId: string | null = null;
        try {
          const fileStat = await stat(filePath);
          const saved = await prisma.rfpAnalysis.create({
            data: {
              projectName: finalProject.projectName,
              clientName: finalProject.clientName,
              venue: finalProject.venue,
              location: finalProject.location,
              filename: body.filename || "document.pdf",
              fileSize: fileStat.size,
              pageCount: ocrResult.totalPages,
              relevantPages: relevantPages.length,
              noisePages: noisePages.length,
              drawingPages: classifiedPages.filter((p) => p.isDrawing).length,
              specsFound: screens.length,
              processingTimeMs: Date.now() - startTime,
              visionPages: mistralPages.filter((p) => p.visionAnalyzed).length,
              screens: JSON.parse(JSON.stringify(screens)),
              requirements: JSON.parse(JSON.stringify(requirements)),
              project: JSON.parse(JSON.stringify(finalProject)),
              triage: JSON.parse(JSON.stringify(triageData)),
              pages: [], // Don't store full page markdown (too big)
              status: "complete",
            },
          });
          analysisId = saved.id;
        } catch (dbErr: any) {
          console.error("[Pipeline] Failed to save to DB:", dbErr.message);
        }

        // =============================================================
        // STEP 7: Provision AnythingLLM workspace for verification chat
        // Non-blocking — don't delay the response. Updates DB in background.
        // =============================================================
        let aiWorkspaceSlug: string | null = null;
        if (analysisId && mistralPages.length > 0) {
          send("stage", {
            stage: "provisioning_workspace",
            message: "Creating AI verification workspace...",
          });

          try {
            aiWorkspaceSlug = await provisionRfpWorkspace({
              analysisId,
              projectName: finalProject.projectName,
              venue: finalProject.venue,
              relevantPages: mistralPages,
              anythingLlmUserId,
            });

            if (aiWorkspaceSlug) {
              await prisma.rfpAnalysis.update({
                where: { id: analysisId },
                data: { aiWorkspaceSlug },
              });
            }
          } catch (wsErr: any) {
            console.error("[Pipeline] Workspace provisioning failed:", wsErr.message);
          }
        }

        send("complete", {
          result: {
            id: analysisId,
            screens,
            requirements,
            project: finalProject,
            pages: mistralPages,
            stats: finalStats,
            triage: triageData,
            aiWorkspaceSlug,
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
