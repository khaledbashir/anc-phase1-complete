import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

/**
 * Dashboard Chat API Route
 * Connects to the master "dashboard-vault" workspace in AnythingLLM
 * This workspace contains documents from ALL projects (cross-synced)
 */
export async function POST(req: NextRequest) {
    try {
        const { message, workspace } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const targetWorkspace = workspace || process.env.ANYTHING_LLM_MASTER_WORKSPACE || "dashboard-vault";

        // Call AnythingLLM chat API
        const response = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${targetWorkspace}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message,
                mode: "chat",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AnythingLLM error:", errorText);
            return NextResponse.json({
                error: "Failed to get response from AI",
                response: "I'm having trouble connecting to the knowledge base. Please try again."
            }, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            response: data.textResponse || data.response || "No response received.",
            sources: data.sources || [],
        });

    } catch (error: any) {
        console.error("Dashboard chat error:", error);
        return NextResponse.json({
            error: error.message,
            response: "An error occurred while processing your request."
        }, { status: 500 });
    }
}
