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
import type { AnalyzedPage } from "./types";

// Bigger chunks = fewer uploads = more reliable on large RFPs
const PAGES_PER_DOC = 25;
const MAX_RETRIES = 1;

// ---------------------------------------------------------------------------
// Create workspace + embed pages
// ---------------------------------------------------------------------------

export async function provisionRfpWorkspace(opts: {
  analysisId: string;
  projectName: string | null;
  venue: string | null;
  relevantPages: AnalyzedPage[];
  anythingLlmUserId?: number | null; // If provided, workspace is assigned to this user
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

    // 3. Upload relevant pages as documents (chunked, with retry)
    const totalChunks = Math.ceil(opts.relevantPages.length / PAGES_PER_DOC);
    const docPaths: string[] = [];
    let uploadSuccess = 0;
    let uploadFailed = 0;

    console.log(`[RFP Workspace] Uploading ${opts.relevantPages.length} pages in ${totalChunks} chunk(s)...`);

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

          const uploadRes = await fetch(`${ANYTHING_LLM_BASE_URL}/document/upload`, {
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
            console.error(`[RFP Workspace] Chunk ${chunkIdx}/${totalChunks} failed (${uploadRes.status}): ${errText.slice(0, 100)}`);
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

    // 4. Add uploaded documents to workspace for embedding
    // Embed whatever we got — partial is better than nothing
    if (docPaths.length > 0) {
      try {
        const embedRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${slug}/update-embeddings`, {
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

    // 5. Assign workspace to uploading user (so they only see their own)
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
