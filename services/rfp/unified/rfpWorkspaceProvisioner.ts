/**
 * RFP Workspace Provisioner
 *
 * After RFP analysis extracts LED specs, this creates a dedicated
 * AnythingLLM workspace and embeds the relevant page text into it.
 *
 * Purpose: verification chat. User sees "3 displays found" in the
 * structured extraction, then opens the workspace to ask:
 * "Did you catch all the ribbon boards?" or "What's the pixel pitch
 * for the main scoreboard?" — two methods of verification.
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { assignWorkspaceToUser } from "@/services/anythingllm/userProvisioner";
import type {
  AnalyzedPage,
  ExtractedLEDSpec,
  ExtractedProjectInfo,
  ExtractedRequirement,
} from "./types";

// Bigger chunks = fewer uploads = more reliable on large RFPs
const PAGES_PER_DOC = 25;
const MAX_RETRIES = 1;

// Internal Docker URL — bypasses EasyPanel reverse proxy for file uploads
const INTERNAL_ALM_URL = "http://basheer_anything-llm:3001/api/v1";

// ---------------------------------------------------------------------------
// Resolve the best AnythingLLM URL (internal Docker > external HTTPS)
// ---------------------------------------------------------------------------

let resolvedUrl: string | null = null;

async function getAlmUrl(): Promise<string> {
  if (resolvedUrl) return resolvedUrl;

  // Try internal Docker URL first (faster, no proxy overhead)
  try {
    const res = await fetch(`${INTERNAL_ALM_URL}/auth`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      resolvedUrl = INTERNAL_ALM_URL;
      console.log("[RFP Workspace] Using internal Docker URL");
      return resolvedUrl;
    }
  } catch {
    // Internal not available — fall back to external
  }

  resolvedUrl = ANYTHING_LLM_BASE_URL!;
  console.log("[RFP Workspace] Using external URL");
  return resolvedUrl;
}

// ---------------------------------------------------------------------------
// Create workspace + embed pages
// ---------------------------------------------------------------------------

export async function provisionRfpWorkspace(opts: {
  analysisId: string;
  projectName: string | null;
  venue: string | null;
  relevantPages: AnalyzedPage[];
  anythingLlmUserId?: number | null;
  /** Extracted data — used to generate structured summary doc for RAG */
  screens?: ExtractedLEDSpec[];
  requirements?: ExtractedRequirement[];
  project?: ExtractedProjectInfo | null;
}): Promise<string | null> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    console.warn("[RFP Workspace] AnythingLLM not configured — skipping");
    return null;
  }

  const baseUrl = await getAlmUrl();

  try {
    // 1. Create workspace
    const safeName = (opts.projectName || opts.venue || "rfp")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 20);
    const slugName = `rfp-${safeName}-${opts.analysisId.slice(-6)}`;

    const createRes = await fetch(`${baseUrl}/workspace/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      },
      body: JSON.stringify({
        name: slugName,
        chatMode: "chat",
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      console.error(`[RFP Workspace] Create failed (${createRes.status}): ${err.slice(0, 200)}`);
      return null;
    }

    const created = await createRes.json();
    const slug = created?.workspace?.slug || slugName;
    console.log(`[RFP Workspace] Created: ${slug}`);

    // 2. Configure workspace — WINNING SETTINGS (GLM-5 tuned, 2026-02)
    // Chunk 4000 / overlap 500 are system-level (set in AnythingLLM admin UI).
    // LLM model inherits system default (GLM-5) — no per-workspace override needed.
    await fetch(`${baseUrl}/workspace/${slug}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      },
      body: JSON.stringify({
        openAiTemp: 0.7,
        chatMode: "chat",
        topN: 30,
        similarityThreshold: 0.25,
        openAiPrompt: [
          `You are an expert RFP data extraction engine for ANC Sports, a stadium LED display integrator.`,
          `Project: ${opts.projectName || "Unknown"} | Venue: ${opts.venue || "Unknown"}`,
          ``,
          `STRICT RULES:`,
          `1. Extract and output EVERY display you find in the documents. No exceptions.`,
          `2. If you find dimensions, pixel pitch, brightness, or quantities ANYWHERE — OUTPUT THEM. Never mark them TBD if the data exists.`,
          `3. NEVER say "incomplete data" or "would need access to more documents." Work with what you have.`,
          `4. NEVER show blank template forms. Only show ACTUAL display data with real values.`,
          `5. List every display as its own row. Never group or summarize multiple displays together.`,
          `6. Base bid displays first, then alternates with their Alt ID (Alt A, Alt B, etc.).`,
          `7. Cite document name and page number for every value.`,
          `8. If an Addendum modifies the original specification, ALWAYS use the Addendum version.`,
          `9. For structural, electrical, warranty, and compliance questions — give specific numbers, not generic statements.`,
          `10. Distinguish Indoor vs Outdoor for every display. Identify mounting type and service access.`,
        ].join("\n"),
      }),
    }).catch((e) => console.error("[RFP Workspace] Config failed:", e));

    // 3. Upload relevant pages as documents (chunked, with retry)
    const totalChunks = Math.ceil(opts.relevantPages.length / PAGES_PER_DOC);
    const docPaths: string[] = [];
    let uploadSuccess = 0;
    let uploadFailed = 0;

    console.log(`[RFP Workspace] Uploading ${opts.relevantPages.length} pages in ${totalChunks} chunk(s) to ${baseUrl}...`);

    for (let i = 0; i < opts.relevantPages.length; i += PAGES_PER_DOC) {
      const chunkIdx = Math.floor(i / PAGES_PER_DOC) + 1;
      const chunk = opts.relevantPages.slice(i, i + PAGES_PER_DOC);
      const startPage = chunk[0]?.pageNumber || i;
      const endPage = chunk[chunk.length - 1]?.pageNumber || i + chunk.length;

      // Build document content
      const content = chunk.map((p) => {
        let text = `\n=== PAGE ${p.pageNumber} (${p.category}) ===\n${p.markdown}`;
        if (p.tables.length > 0) {
          text += "\n\nTABLES:\n" + p.tables.map((t) => t.content).join("\n");
        }
        return text;
      }).join("\n\n");

      const filename = `rfp-pages-${startPage}-${endPage}.txt`;

      // Try upload with retry
      let uploaded = false;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const formData = new FormData();
          const blob = new Blob([content], { type: "text/plain" });
          formData.append("file", blob, filename);

          const uploadRes = await fetch(`${baseUrl}/document/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: formData,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            const docs = uploadData?.documents || [];
            for (const doc of docs) {
              if (doc.location) docPaths.push(doc.location);
            }
            uploaded = true;
            uploadSuccess++;
            console.log(`[RFP Workspace] Chunk ${chunkIdx}/${totalChunks} uploaded (pages ${startPage}-${endPage})`);
            break;
          } else {
            const errText = await uploadRes.text().catch(() => "unknown");
            console.error(`[RFP Workspace] Chunk ${chunkIdx}/${totalChunks} failed (${uploadRes.status}): ${errText.slice(0, 200)}`);
          }
        } catch (err: any) {
          console.error(`[RFP Workspace] Chunk ${chunkIdx}/${totalChunks} attempt ${attempt + 1} error:`, err.message);
        }

        // Wait before retry
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (!uploaded) uploadFailed++;
    }

    console.log(`[RFP Workspace] Upload complete: ${uploadSuccess} succeeded, ${uploadFailed} failed out of ${totalChunks}`);

    // 4. Generate structured extraction summary and upload it
    // This gives the RAG a clean, structured document to retrieve from
    // instead of relying solely on raw PDF chunk parsing.
    if (opts.screens && opts.screens.length > 0) {
      try {
        const summaryMd = buildExtractionSummary(opts);
        const summaryBlob = new Blob([summaryMd], { type: "text/plain" });
        const summaryForm = new FormData();
        summaryForm.append("file", summaryBlob, "extraction-summary.md");

        const summaryRes = await fetch(`${baseUrl}/document/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
          body: summaryForm,
        });

        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          for (const doc of summaryData?.documents || []) {
            if (doc.location) docPaths.push(doc.location);
          }
          console.log(`[RFP Workspace] Extraction summary uploaded`);
        }
      } catch (e: any) {
        console.error("[RFP Workspace] Summary upload failed:", e.message);
      }
    }

    // 5. Add uploaded documents to workspace for embedding
    // Embed whatever we got — partial is better than nothing
    if (docPaths.length > 0) {
      try {
        const embedRes = await fetch(`${baseUrl}/workspace/${slug}/update-embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
          },
          body: JSON.stringify({ adds: docPaths }),
        });
        if (embedRes.ok) {
          console.log(`[RFP Workspace] Embedded ${docPaths.length} document(s) into ${slug}`);
        } else {
          const errText = await embedRes.text().catch(() => "unknown");
          console.error(`[RFP Workspace] Embedding failed (${embedRes.status}): ${errText.slice(0, 200)}`);
        }
      } catch (err: any) {
        console.error("[RFP Workspace] Embedding failed:", err.message);
      }
    } else {
      console.warn("[RFP Workspace] No documents uploaded — workspace will be empty");
    }

    // 6. Assign workspace to uploading user (so they only see their own)
    if (opts.anythingLlmUserId) {
      await assignWorkspaceToUser(slug, opts.anythingLlmUserId).catch((e) =>
        console.error("[RFP Workspace] User assignment failed:", e),
      );
    }

    // Always return slug — even empty workspace is better than no workspace
    return slug;
  } catch (err: any) {
    console.error("[RFP Workspace] Provisioning failed:", err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Build structured markdown from extraction results
// ---------------------------------------------------------------------------

function buildExtractionSummary(opts: {
  projectName: string | null;
  venue: string | null;
  screens?: ExtractedLEDSpec[];
  requirements?: ExtractedRequirement[];
  project?: ExtractedProjectInfo | null;
}): string {
  const lines: string[] = [];
  const specs = opts.screens || [];
  const reqs = opts.requirements || [];
  const proj = opts.project;

  lines.push(`# RFP Extraction Summary — ${opts.projectName || opts.venue || "Unknown Project"}`);
  lines.push("");

  // Project info
  if (proj) {
    lines.push("## Project Information");
    lines.push(`- **Client**: ${proj.clientName || "N/A"}`);
    lines.push(`- **Project**: ${proj.projectName || "N/A"}`);
    lines.push(`- **Venue**: ${proj.venue || "N/A"}`);
    lines.push(`- **Location**: ${proj.location || "N/A"}`);
    lines.push(`- **Environment**: ${proj.isOutdoor ? "Outdoor" : "Indoor"}`);
    lines.push(`- **Union Labor**: ${proj.isUnionLabor ? "Yes" : "No"}`);
    lines.push(`- **Bond Required**: ${proj.bondRequired ? "Yes" : "No"}`);
    if (proj.specialRequirements.length > 0) {
      lines.push(`- **Special Requirements**: ${proj.specialRequirements.join("; ")}`);
    }
    if (proj.schedulePhases.length > 0) {
      lines.push("");
      lines.push("### Schedule Phases");
      for (const phase of proj.schedulePhases) {
        lines.push(`- **${phase.phaseName}**: ${phase.startDate || "TBD"} — ${phase.endDate || "TBD"}${phase.duration ? ` (${phase.duration})` : ""}`);
      }
    }
    lines.push("");
  }

  // Base bid displays
  const baseSpecs = specs.filter((s) => !s.isAlternate);
  const altSpecs = specs.filter((s) => s.isAlternate);

  if (baseSpecs.length > 0) {
    lines.push("## Base Bid LED Displays");
    lines.push("");
    lines.push("| # | Display Name | Location | Width (ft) | Height (ft) | Pitch (mm) | Nits | Env | Qty | Mounting | Service | Special Requirements |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
    baseSpecs.forEach((s, i) => {
      lines.push(
        `| ${i + 1} | ${s.name} | ${s.location} | ${s.widthFt ?? "TBD"} | ${s.heightFt ?? "TBD"} | ${s.pixelPitchMm ?? "TBD"} | ${s.brightnessNits ?? "TBD"} | ${s.environment} | ${s.quantity} | ${s.mountingType || "N/A"} | ${s.serviceType || "N/A"} | ${s.specialRequirements.join(", ") || "None"} |`
      );
    });
    lines.push("");
  }

  // Alternates
  if (altSpecs.length > 0) {
    lines.push("## Cost Alternate Displays");
    lines.push("");
    lines.push("| Alt ID | Display Name | Location | Width (ft) | Height (ft) | Pitch (mm) | Nits | Env | Qty | Description |");
    lines.push("|---|---|---|---|---|---|---|---|---|---|");
    altSpecs.forEach((s) => {
      lines.push(
        `| ${s.alternateId || "—"} | ${s.name} | ${s.location} | ${s.widthFt ?? "TBD"} | ${s.heightFt ?? "TBD"} | ${s.pixelPitchMm ?? "TBD"} | ${s.brightnessNits ?? "TBD"} | ${s.environment} | ${s.quantity} | ${s.alternateDescription || "N/A"} |`
      );
    });
    lines.push("");
  }

  // Requirements
  if (reqs.length > 0) {
    lines.push("## Key Requirements");
    lines.push("");
    const byCategory = new Map<string, ExtractedRequirement[]>();
    for (const req of reqs) {
      const list = byCategory.get(req.category) || [];
      list.push(req);
      byCategory.set(req.category, list);
    }
    for (const [category, items] of byCategory) {
      lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
      for (const item of items) {
        const status = item.status === "critical" ? "CRITICAL" : item.status === "risk" ? "RISK" : item.status;
        lines.push(`- [${status}] ${item.description}${item.date ? ` (${item.date})` : ""}${item.sourcePages.length ? ` — p.${item.sourcePages.join(",")}` : ""}`);
      }
      lines.push("");
    }
  }

  // Summary stats
  lines.push("## Summary");
  lines.push(`- **Total Base Bid Displays**: ${baseSpecs.length}`);
  lines.push(`- **Total Alternates**: ${altSpecs.length}`);
  lines.push(`- **Total Requirements**: ${reqs.length}`);
  lines.push(`- **Generated**: ${new Date().toISOString()}`);

  return lines.join("\n");
}
