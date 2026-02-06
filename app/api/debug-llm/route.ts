
import { NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function GET() {
    try {
        const keyPresent = !!ANYTHING_LLM_KEY;
        const keyLength = ANYTHING_LLM_KEY ? ANYTHING_LLM_KEY.length : 0;

        // Try a simple fetch to the base URL or a health check
        const healthUrl = `${ANYTHING_LLM_BASE_URL}/system/status`; // Guessing checking root or similar
        // Actually, let's just check the /api/v1 endpoint or similar, usually returns 404 or welcome.
        // AnythingLLM usually has /api/v1/auth or something.

        return NextResponse.json({
            keyPresent,
            keyLength,
            baseUrl: ANYTHING_LLM_BASE_URL,
            envKey: process.env.ANYTHING_LLM_KEY ? "Set in process.env" : "Missing in process.env"
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message });
    }
}
