import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function syncDocumentsToAnythingLLM(docs: Array<{ name: string; content: string }>) {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) throw new Error("AnythingLLM not configured");

  const endpoint = `${ANYTHING_LLM_BASE_URL}/document/upload-link`;

  const results: any[] = [];

  for (const doc of docs) {
    // For content-based docs, we need to first upload them or use a different method
    // For now, this function is deprecated in favor of uploadLinkToWorkspace
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: doc.name, content: doc.content }),
    });

    const text = await res.text();
    try {
      results.push({ ok: res.ok, body: JSON.parse(text) });
    } catch (e) {
      results.push({ ok: res.ok, bodyText: text });
    }
  }

  return results;
}

export async function vectorSearch(workspace: string, query: string) {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) throw new Error("AnythingLLM not configured");

  const endpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/vector-search`;

  // REQ-25: Division 11 Target RAG Extraction - Enhanced Keyword Weighting
  // Master Truth Priority: Section 11 06 60 (Display Schedule) is the absolute source
  // Weighted keywords for optimal extraction from 2,500-page RFPs
  const highPriorityKeywords = [
    "Section 11 06 60",      // Master Truth - Display Schedule (highest priority)
    "Display Schedule",      // Master Truth keyword
    "Section 11 63 10",      // LED Display Systems
    "Division 11",           // CSI Division
    "LED Display",           // Product type
    "Pixel Pitch",           // Technical spec
    "Brightness",            // Technical spec (formerly "Nits")
  ];

  // Repeat high-priority keywords to boost their weight in vector search
  const boostedQuery = `${query} ${highPriorityKeywords.join(' ')} ${highPriorityKeywords.slice(0, 3).join(' ')}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      query: boostedQuery, 
      topN: 6,              // Capture top 6 relevant results
      scoreThreshold: 0.2   // 20% similarity threshold for filtering
    }),
  });

  const text = await res.text();
  try {
    return { ok: res.ok, body: JSON.parse(text) };
  } catch (e) {
    return { ok: res.ok, bodyText: text };
  }
}

export async function uploadLinkToWorkspace(workspace: string, urlLink: string) {
  if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) throw new Error("AnythingLLM not configured");

  // Step 1: Upload the link document
  const uploadEndpoint = `${ANYTHING_LLM_BASE_URL}/document/upload-link`;
  const uploadRes = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ link: urlLink, addToWorkspaces: workspace }),
  });

  const uploadText = await uploadRes.text();
  let uploadResult: any;
  try {
    uploadResult = JSON.parse(uploadText);
  } catch (e) {
    uploadResult = null;
  }

  // Step 2: Trigger embedding update for the workspace
  if (uploadRes.ok && uploadResult) {
    // Extract the document path from upload result
    const docPath = uploadResult?.document?.path || uploadResult?.path || uploadResult?.filename || urlLink;

    const embedEndpoint = `${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/update-embeddings`;
    const embedRes = await fetch(embedEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adds: [docPath], deletes: [] }),
    });

    const embedText = await embedRes.text();
    try {
      return { ok: embedRes.ok, body: JSON.parse(embedText) };
    } catch (e) {
      return { ok: embedRes.ok, bodyText: embedText };
    }
  }

  // Return upload result if embedding step failed or wasn't reached
  try {
    return { ok: uploadRes.ok, body: uploadResult };
  } catch (e) {
    return { ok: uploadRes.ok, bodyText: uploadText };
  }
}

