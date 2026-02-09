
import { NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function GET() {
    try {
        const keyPresent = !!ANYTHING_LLM_KEY;
        const keyLength = ANYTHING_LLM_KEY ? ANYTHING_LLM_KEY.length : 0;

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
