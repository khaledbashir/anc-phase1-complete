export async function syncDocumentsToAnythingLLM(docs: Array<{ name: string; content: string }>) {
  const url = process.env.ANYTHING_LLM_URL;
  const key = process.env.ANYTHING_LLM_KEY;
  if (!url || !key) throw new Error("AnythingLLM not configured (ANYTHING_LLM_URL / ANYTHING_LLM_KEY)");

  const endpoint = `${url.replace(/\/$/, "")}/v1/document/upload-link`;

  const results: any[] = [];

  for (const doc of docs) {
    // For content-based docs, we need to first upload them or use a different method
    // For now, this function is deprecated in favor of uploadLinkToWorkspace
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
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
  const url = process.env.ANYTHING_LLM_URL;
  const key = process.env.ANYTHING_LLM_KEY;
  if (!url || !key) throw new Error("AnythingLLM not configured (ANYTHING_LLM_URL / ANYTHING_LLM_KEY)");

  const endpoint = `${url.replace(/\/$/, "")}/v1/workspace/${workspace}/vector-search`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, topN: 4, scoreThreshold: 0.2 }),
  });

  const text = await res.text();
  try {
    return { ok: res.ok, body: JSON.parse(text) };
  } catch (e) {
    return { ok: res.ok, bodyText: text };
  }
}

export async function uploadLinkToWorkspace(workspace: string, urlLink: string) {
  const base = process.env.ANYTHING_LLM_URL;
  const key = process.env.ANYTHING_LLM_KEY;
  if (!base || !key) throw new Error("AnythingLLM not configured (ANYTHING_LLM_URL / ANYTHING_LLM_KEY)");

  // Step 1: Upload the link document
  const uploadEndpoint = `${base.replace(/\/$/, "")}/v1/document/upload-link`;
  const uploadRes = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
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

    const embedEndpoint = `${base.replace(/\/$/, "")}/v1/workspace/${workspace}/update-embeddings`;
    const embedRes = await fetch(embedEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
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

