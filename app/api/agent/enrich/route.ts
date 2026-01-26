import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function POST(req: NextRequest) {
    try {
        const { query, targetFields } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Query is required" }, { status: 400 });
        }

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({ error: "LLM not configured" }, { status: 500 });
        }

        // System prompt for enrichment
        const systemPrompt = `You are a research assistant. Given the company/client name, search your internal knowledge base or simulate a search to provide the following details in a clean JSON format: ${targetFields.join(", ")}. 
    
    If you don't know the exact details, provide highly likely official corporate headquarters information.
    Return ONLY the JSON object.
    
    Example: 
    Query: "Lakers"
    Response: { "receiver.address": "2101 E El Segundo Blvd", "receiver.city": "El Segundo", "receiver.zipCode": "90245", "receiver.country": "USA" }`;

        const chatPayload = {
            message: `Research and provide details for: ${query}. Use exactly these keys: ${targetFields.join(", ")}`,
            mode: 'chat',
        };

        // We'll use the generic anc-estimator workspace for this general lookup
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/anc-estimator/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify(chatPayload),
        });

        const data = await res.json();
        const textResponse = data?.textResponse || data?.text || "";

        // Extract JSON from response
        try {
            const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const results = JSON.parse(jsonMatch[0]);
                return NextResponse.json({ ok: true, results });
            }
        } catch (e) {
            console.error("Failed to parse AI enrichment JSON:", e);
        }

        return NextResponse.json({ ok: false, error: "Cloud not find details" }, { status: 404 });
    } catch (error: any) {
        console.error("Enrichment API error:", error);
        return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
    }
}
