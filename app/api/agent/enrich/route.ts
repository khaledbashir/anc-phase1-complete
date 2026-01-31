import { NextRequest, NextResponse } from "next/server";
import { queryVault } from "@/lib/anything-llm";
import { extractJson } from "@/lib/json-utils";
import { searchVenueAddress } from "@/lib/serper";

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

        // DEMO OVERRIDE: Indiana Fever / Gainbridge Fieldhouse (avoids LLM wait)
        if (normalizedQuery.includes("indiana fever") || normalizedQuery.includes("indiana fevr") || (normalizedQuery.includes("indiana") && normalizedQuery.includes("fever"))) {
            const indianaCandidates = [
                {
                    label: "Indiana Fever (WNBA) – Gainbridge Fieldhouse",
                    confidence: 0.98,
                    notes: "Primary venue: Gainbridge Fieldhouse, Indianapolis.",
                    results: {
                        "receiver.name": "Indiana Fever",
                        "receiver.address": "125 S Pennsylvania St",
                        "receiver.city": "Indianapolis",
                        "receiver.zipCode": "46204",
                        "details.venue": "Gainbridge Fieldhouse",
                    },
                },
                {
                    label: "Pacers Sports & Entertainment (Gainbridge Fieldhouse)",
                    confidence: 0.92,
                    notes: "Arena operator; same building as Indiana Fever.",
                    results: {
                        "receiver.name": "Pacers Sports & Entertainment",
                        "receiver.address": "125 S Pennsylvania St",
                        "receiver.city": "Indianapolis",
                        "receiver.zipCode": "46204",
                        "details.venue": "Gainbridge Fieldhouse",
                    },
                },
                {
                    label: "Gainbridge Fieldhouse",
                    confidence: 0.88,
                    notes: "Venue only; use for project/display schedule context.",
                    results: {
                        "receiver.name": "Gainbridge Fieldhouse",
                        "receiver.address": "125 S Pennsylvania St",
                        "receiver.city": "Indianapolis",
                        "receiver.zipCode": "46204",
                        "details.venue": "Gainbridge Fieldhouse",
                    },
                },
            ];
            return NextResponse.json({
                ok: true,
                correctedQuery: "Indiana Fever",
                candidates: indianaCandidates,
                results: undefined,
            });
        }

        // DEMO OVERRIDE: Garden Square (Brampton)
        if (normalizedQuery.includes("garden square") || normalizedQuery.includes("gardn square")) {
            const candidates = [
                {
                    label: "Garden Square (Brampton)",
                    confidence: 0.98,
                    notes: "Verified public square with existing LED infrastructure.",
                    results: {
                        "receiver.name": "City of Brampton",
                        "receiver.address": "12 Main St N",
                        "receiver.city": "Brampton",
                        "receiver.state": "ON",
                        "receiver.zipCode": "L6V 1N6",
                        "details.venue": "Garden Square",
                        "details.market": "Municipal / Public Space",
                        "details.installType": "Outdoor LED"
                    }
                },
                {
                    label: "Madison Square Garden",
                    confidence: 0.45,
                    notes: "The World's Most Famous Arena (NYC).",
                    results: {
                        "receiver.name": "MSG Entertainment",
                        "receiver.address": "4 Pennsylvania Plaza",
                        "receiver.city": "New York",
                        "receiver.state": "NY",
                        "receiver.zipCode": "10001",
                        "details.venue": "Madison Square Garden",
                        "details.market": "Professional Sports / Entertainment",
                        "details.installType": "Indoor Arena"
                    }
                }
            ];

            // If the query is very specific to Brampton, just return that one
            if (normalizedQuery.includes("brampton")) {
                const b = candidates[0];
                return NextResponse.json({ ok: true, correctedQuery: "Garden Square", candidates: [b], results: b.results });
            }

            return NextResponse.json({ ok: true, correctedQuery: "Garden Square", candidates, results: undefined }); // undefined results forces picker
        }

        // DEMO OVERRIDE: Baltimore Ravens / M&T Bank Stadium
        if (normalizedQuery.includes("baltimore ravens") || normalizedQuery.includes("ravens") ||
            normalizedQuery.includes("m&t bank stadium") || normalizedQuery.includes("m&t bank") ||
            (normalizedQuery.includes("baltimore") && (normalizedQuery.includes("stadium") || normalizedQuery.includes("ravens")))) {
            const baltimoreCandidates = [
                {
                    label: "Baltimore Ravens (NFL) – M&T Bank Stadium",
                    confidence: 0.98,
                    notes: "Primary venue: M&T Bank Stadium, Baltimore.",
                    results: {
                        "receiver.name": "Baltimore Ravens",
                        "receiver.address": "1101 Russell St",
                        "receiver.city": "Baltimore",
                        "receiver.state": "MD",
                        "receiver.zipCode": "21230",
                        "details.venue": "M&T Bank Stadium",
                    },
                },
                {
                    label: "M&T Bank Stadium",
                    confidence: 0.95,
                    notes: "Venue only; home of the Baltimore Ravens.",
                    results: {
                        "receiver.name": "M&T Bank Stadium",
                        "receiver.address": "1101 Russell St",
                        "receiver.city": "Baltimore",
                        "receiver.state": "MD",
                        "receiver.zipCode": "21230",
                        "details.venue": "M&T Bank Stadium",
                    },
                },
                {
                    label: "Ravens Stadium Corporation",
                    confidence: 0.88,
                    notes: "Stadium operator entity.",
                    results: {
                        "receiver.name": "Ravens Stadium Corporation",
                        "receiver.address": "1101 Russell St",
                        "receiver.city": "Baltimore",
                        "receiver.state": "MD",
                        "receiver.zipCode": "21230",
                        "details.venue": "M&T Bank Stadium",
                    },
                },
            ];
            return NextResponse.json({
                ok: true,
                correctedQuery: "Baltimore Ravens",
                candidates: baltimoreCandidates,
                results: undefined,
            });
        }

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
                // LLM failed - try Serper web search fallback
                console.log("[Enrich] LLM returned no JSON, trying Serper fallback for:", normalizedQuery);
                const serperResults = await searchVenueAddress(normalizedQuery, fields);
                if (serperResults && Object.keys(serperResults).length > 0) {
                    const candidate = {
                        label: normalizedQuery,
                        confidence: 0.75,
                        notes: "Found via web search",
                        results: serperResults,
                    };
                    return NextResponse.json({
                        ok: true,
                        correctedQuery: normalizedQuery,
                        candidates: [candidate],
                        results: serperResults,
                    });
                }
                return NextResponse.json({ ok: false, error: "Could not find venue details" }, { status: 404 });
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
                // LLM returned no usable candidates - try Serper fallback
                console.log("[Enrich] LLM returned no candidates, trying Serper fallback for:", normalizedQuery);
                const serperResults = await searchVenueAddress(normalizedQuery, fields);
                if (serperResults && Object.keys(serperResults).length > 0) {
                    const candidate = {
                        label: normalizedQuery,
                        confidence: 0.75,
                        notes: "Found via web search",
                        results: serperResults,
                    };
                    return NextResponse.json({
                        ok: true,
                        correctedQuery: normalizedQuery,
                        candidates: [candidate],
                        results: serperResults,
                    });
                }
                return NextResponse.json({ ok: false, error: "Could not find venue details" }, { status: 404 });
            }

            const response: any = { ok: true, correctedQuery, candidates };
            if (candidates.length === 1) response.results = candidates[0].results;
            return NextResponse.json(response);
        } catch (e) {
            console.error("AI Enrichment JSON Parse Error:", e);
            // JSON parsing failed - try Serper fallback
            console.log("[Enrich] JSON parse failed, trying Serper fallback for:", normalizedQuery);
            const serperResults = await searchVenueAddress(normalizedQuery, fields);
            if (serperResults && Object.keys(serperResults).length > 0) {
                const candidate = {
                    label: normalizedQuery,
                    confidence: 0.70,
                    notes: "Found via web search (LLM parsing failed)",
                    results: serperResults,
                };
                return NextResponse.json({
                    ok: true,
                    correctedQuery: normalizedQuery,
                    candidates: [candidate],
                    results: serperResults,
                });
            }
        }

        return NextResponse.json({ ok: false, error: "Could not find venue details" }, { status: 404 });
    } catch (error: any) {
        console.error("Enrichment API error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
