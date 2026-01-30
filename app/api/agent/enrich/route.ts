import { NextRequest, NextResponse } from "next/server";
import { queryVault } from "@/lib/anything-llm";
import { extractJson } from "@/lib/json-utils";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, targetFields } = body;

        const fields = Array.isArray(targetFields)
            ? targetFields.filter((f: unknown): f is string => typeof f === "string" && f.trim().length > 0)
            : [];

        if (typeof query !== "string" || query.trim().length === 0) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (fields.length === 0) {
            return NextResponse.json({ error: "targetFields is required" }, { status: 400 });
        }

        const workspace = process.env.ANYTHING_LLM_WORKSPACE || "anc-estimator";

        const getByPath = (obj: unknown, path: string) => {
            if (!obj || typeof obj !== "object") return undefined;
            return path.split(".").reduce<unknown>((acc, key) => {
                if (!acc || typeof acc !== "object") return undefined;
                return (acc as Record<string, unknown>)[key];
            }, obj);
        };

        const normalizeQuery = (input: string) => {
            const tokens = input
                .toLowerCase()
                .replace(/\s+/g, " ")
                .trim()
                .split(" ")
                .map((t) => t.trim())
                .filter(Boolean)
                .map((t) => {
                    if (t === "kin") return "king";
                    if (t === "staduim") return "stadium";
                    if (t === "stadim") return "stadium";
                    if (t === "staduim,") return "stadium";
                    return t;
                });
            return tokens.join(" ");
        };

        const normalizedQuery = normalizeQuery(query);
        const keysJson = JSON.stringify(fields);

        const prompt = `The user provided a venue/client query that may contain typos: "${query}".

First, correct the query text if needed. Then return up to 5 likely matches.

Return ONLY valid JSON with this exact shape:
{
  "correctedQuery": "string",
  "candidates": [
    {
      "label": "string",
      "confidence": 0.0,
      "notes": "string",
      "results": { ${fields.map((f) => `"${f}": ""`).join(", ")} }
    }
  ]
}

Rules:
- Use these exact keys inside results: ${keysJson}
- Each results value must be a string (or empty string if unknown)
- If ambiguous (multiple similarly named venues), include multiple candidates
- Do not include any text outside JSON

Search target: "${normalizedQuery}"`;

        const ask = async (p: string) => {
            const textResponse = await queryVault(workspace, p, "chat");
            const jsonText = extractJson(textResponse);
            return jsonText;
        };

        const jsonText = (await ask(prompt)) ?? (await ask(`${prompt}\n\nReturn JSON only. No markdown. No analysis.`));

        try {
            if (!jsonText) {
                return NextResponse.json({ ok: false, error: "AI response was not JSON" }, { status: 404 });
            }

            // Attempt to repair truncated JSON if it looks like a tool call or just broken
            let safeJsonText = jsonText
                .replace(/[“”]/g, '"')
                .replace(/[‘’]/g, "'");
            
            // Simple repair: if it ends with " or similar, try to close it
            // (This is a basic heuristic, better to rely on robust AI response)

            let parsed: unknown;
            try {
                parsed = JSON.parse(safeJsonText);
            } catch (e) {
                console.warn("[Enrich] JSON parse failed, trying to repair...", safeJsonText);
                // Try appending braces if it looks like it's missing them
                try {
                     parsed = JSON.parse(safeJsonText + "}");
                } catch (e2) {
                    try {
                        parsed = JSON.parse(safeJsonText + "}}");
                    } catch (e3) {
                         throw e; // Original error
                    }
                }
            }

            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                // Check if it's a tool call response that we should ignore or handle
                if ((parsed as any)?.name && (parsed as any)?.arguments) {
                     return NextResponse.json({ ok: false, error: "AI is performing a search, please try again in a moment." }, { status: 404 });
                }
                return NextResponse.json({ ok: false, error: "AI response was not an object" }, { status: 404 });
            }

            const payload = parsed as Record<string, unknown>;
            const correctedQuery = typeof payload.correctedQuery === "string" && payload.correctedQuery.trim().length > 0
                ? payload.correctedQuery.trim()
                : normalizedQuery;

            const rawCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
            const candidates = rawCandidates
                .filter((c) => c && typeof c === "object" && !Array.isArray(c))
                .map((c: any) => {
                    const resultsObj = (c?.results && typeof c.results === "object" && !Array.isArray(c.results)) ? c.results : {};
                    const cleanedResults: Record<string, string> = {};
                    for (const field of fields) {
                        const direct = resultsObj[field];
                        const nested = getByPath(resultsObj, field);
                        const lastKey = field.includes(".") ? field.split(".").at(-1) : undefined;
                        const shallow = lastKey ? resultsObj[lastKey] : undefined;

                        const value = direct ?? nested ?? shallow;
                        if (value === undefined || value === null) continue;
                        const normalized = typeof value === "string" ? value.trim() : String(value).trim();
                        if (normalized.length === 0) continue;
                        cleanedResults[field] = normalized;
                    }

                    const label = typeof c?.label === "string" && c.label.trim().length > 0 ? c.label.trim() : correctedQuery;
                    const confidence = Number(c?.confidence);
                    const notes = typeof c?.notes === "string" ? c.notes.trim() : "";
                    return {
                        label,
                        confidence: Number.isFinite(confidence) ? confidence : 0,
                        notes,
                        results: cleanedResults,
                    };
                })
                .filter((c) => Object.keys(c.results).length > 0)
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 5);

            if (candidates.length === 0) {
                return NextResponse.json({ ok: false, error: "AI could not find verified details" }, { status: 404 });
            }

            const response: any = { ok: true, correctedQuery, candidates };
            if (candidates.length === 1) response.results = candidates[0].results;
            return NextResponse.json(response);
        } catch (e) {
            console.error("AI Enrichment JSON Parse Error:", e);
        }

        return NextResponse.json({ ok: false, error: "AI could not find verified details" }, { status: 404 });
    } catch (error: any) {
        console.error("Enrichment API error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
