import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

/**
 * POST /api/copilot/chat
 * Project-scoped AI chat — talks to the PROJECT's AnythingLLM workspace,
 * NOT the dashboard aggregator.
 *
 * Body: { projectId: string, message: string, useAgent?: boolean }
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId, message, useAgent } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }
        if (!projectId) {
            return NextResponse.json({
                error: "projectId is required",
                response: "No project context — cannot determine which AI workspace to use.",
            }, { status: 400 });
        }

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({
                error: "AnythingLLM not configured",
                response: "The AI backend is offline. Please configure ANYTHING_LLM credentials.",
            }, { status: 500 });
        }

        // Look up the project's AnythingLLM workspace slug from the database
        const proposal = await prisma.proposal.findUnique({
            where: { id: projectId },
            select: { aiWorkspaceSlug: true, workspace: { select: { aiWorkspaceSlug: true } } },
        });

        // Prefer proposal-level slug, fall back to workspace-level slug
        const workspaceSlug =
            proposal?.aiWorkspaceSlug ||
            proposal?.workspace?.aiWorkspaceSlug ||
            null;

        if (!workspaceSlug) {
            return NextResponse.json({
                error: "No AI workspace for this project",
                response: "No AI workspace has been provisioned for this project yet. Try creating a new project or re-saving this one.",
            }, { status: 404 });
        }

        console.log(`[Copilot] Project ${projectId} → workspace "${workspaceSlug}" (agent: ${useAgent ? "YES" : "NO"})`);

        // Call AnythingLLM chat endpoint for this project's workspace
        // ANYTHING_LLM_BASE_URL already ends with /api/v1
        const response = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message: useAgent ? `@agent ${message}` : message,
                mode: "chat",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Copilot] AnythingLLM error (${response.status}):`, errorText);
            return NextResponse.json({
                error: "AI workspace error",
                response: `The AI workspace "${workspaceSlug}" returned an error. It may need to be reconfigured.`,
            }, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            response: data.textResponse || data.response || "No response received.",
            sources: data.sources || [],
            thinking: data.thinking || null,
            workspace: workspaceSlug,
        });
    } catch (error: any) {
        console.error("[Copilot] Error:", error);
        return NextResponse.json({
            error: error.message,
            response: "An error occurred while processing your request.",
        }, { status: 500 });
    }
}
