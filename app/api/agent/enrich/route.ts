import { NextRequest, NextResponse } from "next/server";
import { queryVault } from "@/lib/anything-llm";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { query, targetFields } = body;

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        const workspace = process.env.ANYTHING_LLM_WORKSPACE || "anc-estimator";

        // Ferrari Enrichment Prompt exploiting @agent search
        // We use @agent to trigger AnythingLLM's web search tool if enabled
        const prompt = `@agent search for the professional corporate headquarters details of "${query}". 
        Provide the following information as a clean JSON object ONLY: ${targetFields.join(", ")}.
        Required keys: ${targetFields.join(", ")}.
        Return ONLY the raw JSON string starting with { and ending with }. 
        If specific fields are unknown, provide best-guess based on official headquarters info.`;

        const textResponse = await queryVault(workspace, prompt, "chat");

        // Extract JSON from response
        try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const results = JSON.parse(jsonMatch[0]);

                // Cleanup: ensure keys match targetFields exactly
                const cleanedResults: Record<string, any> = {};
                if (Array.isArray(targetFields)) {
                    targetFields.forEach(f => {
                        if (results[f]) cleanedResults[f] = results[f];
                    });
                } else {
                    // Fallback if targetFields wasn't an array
                    Object.assign(cleanedResults, results);
                }

                return NextResponse.json({ ok: true, results: cleanedResults });
            }
        } catch (e) {
            console.error("AI Enrichment JSON Parse Error:", e);
            console.log("Raw Response received:", textResponse);
        }

        return NextResponse.json({ ok: false, error: "AI could not find verified details" }, { status: 404 });
    } catch (error: any) {
        console.error("Enrichment API error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
