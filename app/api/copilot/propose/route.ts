import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { prisma } from "@/lib/prisma";
import {
    ConversationStage,
    processStage,
    isOffTopic,
    getStagePrompt,
    createInitialState,
} from "@/services/chat/proposalConversationFlow";
import type { CollectedData } from "@/services/chat/proposalConversationFlow";

/**
 * POST /api/copilot/propose
 *
 * Guided conversation flow for building proposals.
 * Processes user messages through the state machine, returns actions + next question.
 * Falls back to AnythingLLM for off-topic questions.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            projectId,
            message,
            conversationStage,
            collectedData,
        } = body as {
            projectId?: string;
            message: string;
            conversationStage: string;
            collectedData: CollectedData;
        };

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        const stage = (conversationStage as ConversationStage) || ConversationStage.GREETING;
        const collected: CollectedData = collectedData || createInitialState().collected;

        // Check if the message is off-topic — forward to AnythingLLM
        if (isOffTopic(stage, message)) {
            const aiReply = await forwardToAnythingLLM(projectId, message);
            return NextResponse.json({
                reply: aiReply + "\n\nBack to the proposal — " + getStagePrompt(stage, collected),
                actions: [],
                nextStage: stage,
                collected,
            });
        }

        // Process through the state machine
        const result = processStage(stage, message, collected);

        return NextResponse.json({
            reply: result.reply,
            actions: result.actions,
            nextStage: result.nextStage,
            collected: result.collected,
            summary: result.summary || null,
        });
    } catch (error: any) {
        console.error("[Copilot/Propose] Error:", error);
        return NextResponse.json({
            error: error.message,
            reply: "Something went wrong processing your message. Try again.",
            actions: [],
            nextStage: "GREETING",
            collected: createInitialState().collected,
        }, { status: 500 });
    }
}

/**
 * Forward an off-topic message to the project's AnythingLLM workspace.
 * Falls back to a generic response if AnythingLLM is unavailable.
 */
async function forwardToAnythingLLM(projectId: string | undefined, message: string): Promise<string> {
    if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
        return "I can't search for that right now — the AI backend is offline.";
    }

    // Look up workspace slug
    let workspaceSlug = "dashboard-vault";
    if (projectId && projectId !== "new") {
        try {
            const proposal = await prisma.proposal.findUnique({
                where: { id: projectId },
                select: { aiWorkspaceSlug: true, workspace: { select: { aiWorkspaceSlug: true } } },
            });
            workspaceSlug =
                proposal?.aiWorkspaceSlug ||
                proposal?.workspace?.aiWorkspaceSlug ||
                "dashboard-vault";
        } catch {
            // Fall through to dashboard-vault
        }
    }

    try {
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({ message, mode: "chat", sessionId: `propose-${projectId || "anon"}` }),
        });

        if (!res.ok) {
            return "I couldn't look that up right now. Let's continue with the proposal.";
        }

        const data = await res.json();
        let content = data.textResponse || data.response || "No response.";

        // Strip <think> tags
        if (content.includes("<think>")) {
            content = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
        }

        return content;
    } catch {
        return "I couldn't reach the AI backend. Let's continue with the proposal.";
    }
}
