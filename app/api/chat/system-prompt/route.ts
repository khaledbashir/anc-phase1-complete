import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

const WORKSPACE = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";

/**
 * GET /api/chat/system-prompt
 * Reads the system prompt from the AnythingLLM workspace.
 */
export async function GET() {
    try {
        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({ error: "AnythingLLM not configured" }, { status: 500 });
        }

        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${WORKSPACE}`, {
            headers: { Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        });

        if (!res.ok) {
            return NextResponse.json({ error: `Failed to fetch workspace: ${res.status}` }, { status: res.status });
        }

        const data = await res.json();
        const workspace = Array.isArray(data.workspace) ? data.workspace[0] : data.workspace;
        const prompt = workspace?.openAiPrompt || "";

        return NextResponse.json({ prompt, workspace: WORKSPACE });
    } catch (error: any) {
        console.error("[Chat/SystemPrompt] GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * POST /api/chat/system-prompt
 * Updates the system prompt on the AnythingLLM workspace.
 * Body: { prompt: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json();

        if (typeof prompt !== "string") {
            return NextResponse.json({ error: "prompt must be a string" }, { status: 400 });
        }

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({ error: "AnythingLLM not configured" }, { status: 500 });
        }

        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${WORKSPACE}/update`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({ openAiPrompt: prompt }),
        });

        if (!res.ok) {
            const errorText = await res.text();
            return NextResponse.json({ error: `Failed to update: ${errorText}` }, { status: res.status });
        }

        console.log(`[Chat/SystemPrompt] Updated system prompt (${prompt.length} chars) on workspace ${WORKSPACE}`);
        return NextResponse.json({ success: true, workspace: WORKSPACE });
    } catch (error: any) {
        console.error("[Chat/SystemPrompt] POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
