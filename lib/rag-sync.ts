export async function syncDocumentsToAnythingLLM(docs: Array<{ name: string; content: string }>) {
  const url = process.env.ANYTHING_LLM_URL;
  const key = process.env.ANYTHING_LLM_KEY;
  if (!url || !key) throw new Error("AnythingLLM not configured (ANYTHING_LLM_URL / ANYTHING_LLM_KEY)");

  const endpoint = `${url.replace(/\/$/, "")}/v1/document/upload`;

  const results: any[] = [];

  for (const doc of docs) {
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
