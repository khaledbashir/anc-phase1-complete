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
import type { AnalyzedPage } from "./types";

// ---------------------------------------------------------------------------
// Create workspace + embed pages
// ---------------------------------------------------------------------------

export async function provisionRfpWorkspace(opts: {
  analysisId: string;
  projectName: string | null;
  venue: string | null;
  relevantPages: AnalyzedPage[];
}): Promise<string | null> {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
    console.warn("[RFP Workspace] AnythingLLM not configured — skipping");
    return null;
  }

  try {
    // 1. Create workspace
    const safeName = (opts.projectName || opts.venue || "rfp")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 20);
    const slugName = `rfp-${safeName}-${opts.analysisId.slice(-6)}`;

    const createRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
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

    // 2. Configure workspace
    await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${slug}/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      },
      body: JSON.stringify({
        openAiTemp: 0.2,
        chatMode: "chat",
        openAiPrompt: `You are an expert RFP analyst for ANC Sports (LED display manufacturer). You have access to the relevant pages from an RFP document. Answer questions about LED display specifications, requirements, deadlines, and scope of work. Be precise and cite page numbers when possible. Project: ${opts.projectName || "Unknown"}, Venue: ${opts.venue || "Unknown"}.`,
      }),
    }).catch((e) => console.error("[RFP Workspace] Config failed:", e));

    // 3. Upload relevant pages as documents
    // Group pages into chunks to avoid too many uploads
    const PAGES_PER_DOC = 10;
    const docPaths: string[] = [];

    for (let i = 0; i < opts.relevantPages.length; i += PAGES_PER_DOC) {
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

      try {
        // Upload as raw text document
        const formData = new FormData();
        const blob = new Blob([content], { type: "text/plain" });
        formData.append("file", blob, filename);

        const uploadRes = await fetch(`${ANYTHING_LLM_BASE_URL}/document/upload`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
          },
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // AnythingLLM returns { success: true, error: null, documents: [{ location: "..." }] }
          const docs = uploadData?.documents || [];
          for (const doc of docs) {
            if (doc.location) docPaths.push(doc.location);
          }
        }
      } catch (err: any) {
        console.error(`[RFP Workspace] Upload chunk ${startPage}-${endPage} failed:`, err.message);
      }
    }

    // 4. Add uploaded documents to workspace for embedding
    if (docPaths.length > 0) {
      try {
        await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${slug}/update-embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
          },
          body: JSON.stringify({ adds: docPaths }),
        });
        console.log(`[RFP Workspace] Embedded ${docPaths.length} document(s) into ${slug}`);
      } catch (err: any) {
        console.error("[RFP Workspace] Embedding failed:", err.message);
      }
    }

    return slug;
  } catch (err: any) {
    console.error("[RFP Workspace] Provisioning failed:", err.message);
    return null;
  }
}
