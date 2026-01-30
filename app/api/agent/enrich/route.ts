import { NextRequest, NextResponse } from "next/server";
import { queryVault } from "@/lib/anything-llm";

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

        const extractJson = (text: string) => {
            const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
            const candidate = (fenced?.[1] ?? text).trim();
            const start = candidate.indexOf("{");
            const end = candidate.lastIndexOf("}");
            if (start === -1 || end === -1 || end <= start) return null;
            return candidate.slice(start, end + 1);
        };

        const keysJson = JSON.stringify(fields);
        const prompt = `@agent search for the official corporate headquarters address and location details of "${query}". 
        
Return the results as a JSON object with these exact keys: ${keysJson}. 
Each value must be a string. If you cannot find a specific detail, return an empty string for that key.
Do not include any text other than the JSON object itself.

Example output format:
{
  "receiver.address": "123 Main St",
  "receiver.city": "New York",
  "receiver.zipCode": "10001",
  "details.venue": "Madison Square Garden"
}`;

        console.log(`[Enrich] Querying AnythingLLM for: ${query}`);
        const textResponse = await queryVault(workspace, prompt, "chat");
        console.log(`[Enrich] Raw response: ${textResponse}`);

        try {
            const jsonText = extractJson(textResponse);
            if (!jsonText) {
                return NextResponse.json({ ok: false, error: "AI response was not JSON" }, { status: 404 });
            }

            const parsed = JSON.parse(
                jsonText
                    .replace(/[“”]/g, '"')
                    .replace(/[‘’]/g, "'")
            ) as unknown;

            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
                return NextResponse.json({ ok: false, error: "AI response was not an object" }, { status: 404 });
            }

            const resultsObj = parsed as Record<string, unknown>;
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

            if (Object.keys(cleanedResults).length === 0) {
                return NextResponse.json({ ok: false, error: "AI could not find verified details" }, { status: 404 });
            }

            return NextResponse.json({ ok: true, results: cleanedResults });
        } catch (e) {
            console.error("AI Enrichment JSON Parse Error:", e);
        }

        return NextResponse.json({ ok: false, error: "AI could not find verified details" }, { status: 404 });
    } catch (error: any) {
        console.error("Enrichment API error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
