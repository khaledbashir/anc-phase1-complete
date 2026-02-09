import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { prisma } from "@/lib/prisma";
import {
    ConversationStage,
    processStage,
    createInitialState,
} from "@/services/chat/proposalConversationFlow";
import type { CollectedData, StageAction } from "@/services/chat/proposalConversationFlow";

/**
 * POST /api/copilot/propose
 *
 * LLM-powered guided conversation for building proposals.
 * Every message goes through AnythingLLM with a stage-aware system prompt.
 * The LLM responds naturally AND returns structured JSON for form actions.
 * Falls back to regex parsing if LLM doesn't return valid JSON.
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

        // Look up workspace slug
        const workspaceSlug = await getWorkspaceSlug(projectId);

        // Try LLM-powered flow first
        if (ANYTHING_LLM_BASE_URL && ANYTHING_LLM_KEY && workspaceSlug) {
            const llmResult = await llmGuidedFlow(workspaceSlug, projectId, stage, message, collected);
            if (llmResult) {
                return NextResponse.json(llmResult);
            }
        }

        // Fallback: regex state machine (if LLM is unavailable)
        console.log("[Copilot/Propose] LLM unavailable, falling back to regex parser");
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
            reply: "Something went wrong. Try again.",
            actions: [],
            nextStage: "GREETING",
            collected: createInitialState().collected,
        }, { status: 500 });
    }
}

// ============================================================================
// LLM-POWERED GUIDED FLOW
// ============================================================================

function buildSystemPrompt(stage: ConversationStage, collected: CollectedData): string {
    const stageDescriptions: Record<string, string> = {
        GREETING: "Ask the user what client/venue this proposal is for. Be warm and brief.",
        CLIENT_NAME: "The user is telling you the client name. Confirm it and ask about the LED displays they need.",
        DISPLAYS: "The user is describing LED displays. Extract: dimensions (width x height in meters), pixel pitch (mm), quantity, and description. If they're vague, ask clarifying questions naturally.",
        DISPLAY_PRICING: "The user is providing sell prices for the displays. Extract dollar amounts. Accept formats like $200k, $200,000, 200000, $1.5M, etc.",
        SERVICES: "The user is listing service costs (installation, structural, electrical, rigging, labor, etc). Extract service names and dollar amounts.",
        PM_WARRANTY: "The user is listing PM, engineering, and warranty costs. Extract names and amounts. If they say skip/none, that's fine.",
        TAX_BOND: "The user is providing tax and/or bond rates as percentages.",
        REVIEW: "Show the user a summary and ask if they want to generate a budget estimate, formal proposal, or LOI.",
        GENERATE: "The user is choosing a document type to generate.",
        DONE: "The proposal is complete.",
    };

    const collectedSummary = JSON.stringify({
        clientName: collected.clientName || null,
        displays: collected.displays,
        displayPrices: collected.displayPrices,
        services: collected.services,
        taxRate: collected.taxRate || null,
        bondRate: collected.bondRate || null,
    });

    return `You are an AI assistant helping build an LED display proposal for ANC Sports. You're having a natural conversation with an estimator.

CURRENT STAGE: ${stage}
TASK: ${stageDescriptions[stage] || "Help the user with their proposal."}

DATA COLLECTED SO FAR:
${collectedSummary}

INSTRUCTIONS:
1. Respond naturally and conversationally — you're a helpful colleague, not a form.
2. After your conversational response, include a JSON block with any data you extracted.
3. If the user says "skip", "go back", "start over", or seems frustrated, handle it gracefully.
4. If the user asks a question unrelated to the proposal, answer it briefly then guide back.
5. Keep responses concise — 1-3 sentences max for the conversational part.

RESPONSE FORMAT — always end your message with a JSON block like this:
\`\`\`json
{
  "extracted": { ... },
  "nextStage": "DISPLAYS",
  "actions": []
}
\`\`\`

The "extracted" object depends on the stage:
- CLIENT_NAME: { "clientName": "Dallas Cowboys" }
- DISPLAYS: { "displays": [{ "description": "LED wall", "widthM": 4.05, "heightM": 10.20, "pitchMm": 2.5, "quantity": 1 }] }
- DISPLAY_PRICING: { "prices": [200000] }
- SERVICES: { "services": [{ "description": "Installation", "price": 115000 }] }
- PM_WARRANTY: { "services": [{ "description": "PM", "price": 12500 }] }
- TAX_BOND: { "taxRate": 0.13, "bondRate": 0.02 }
- REVIEW/GENERATE: { "documentType": "BUDGET" }

If you couldn't extract data (user was vague, off-topic, etc), set "extracted": null and keep "nextStage" the same as the current stage.
If the user says "skip", set "extracted": null and advance "nextStage" to the next logical stage.
If the user says "go back", set "nextStage" to the previous stage.
If the user says "start over", set "nextStage": "CLIENT_NAME" and "extracted": { "reset": true }.`;
}

const STAGE_ORDER: ConversationStage[] = [
    ConversationStage.CLIENT_NAME,
    ConversationStage.DISPLAYS,
    ConversationStage.DISPLAY_PRICING,
    ConversationStage.SERVICES,
    ConversationStage.PM_WARRANTY,
    ConversationStage.TAX_BOND,
    ConversationStage.REVIEW,
];

async function llmGuidedFlow(
    workspaceSlug: string,
    projectId: string | undefined,
    stage: ConversationStage,
    message: string,
    collected: CollectedData,
): Promise<any | null> {
    try {
        const systemPrompt = buildSystemPrompt(stage, collected);
        const fullMessage = `[System Context: ${systemPrompt}]\n\nUser: ${message}`;

        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message: fullMessage,
                mode: "chat",
                sessionId: `guided-${projectId || "new"}`,
            }),
        });

        if (!res.ok) {
            console.error("[Copilot/Propose] LLM error:", res.status);
            return null; // Fall back to regex
        }

        const data = await res.json();
        let content = data.textResponse || data.response || "";

        // Strip <think> tags
        if (content.includes("<think>")) {
            content = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
        }

        // Extract JSON block from the response
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*"nextStage"[\s\S]*\}/);
        let extracted: any = null;
        let nextStage = stage;
        let actions: StageAction[] = [];

        if (jsonMatch) {
            try {
                const jsonStr = jsonMatch[1] || jsonMatch[0];
                const parsed = JSON.parse(jsonStr);
                extracted = parsed.extracted;
                if (parsed.nextStage && Object.values(ConversationStage).includes(parsed.nextStage)) {
                    nextStage = parsed.nextStage as ConversationStage;
                }

                // Process extracted data into actions + update collected
                if (extracted && !extracted.reset) {
                    if (extracted.clientName) {
                        collected.clientName = extracted.clientName;
                        actions.push({ type: "fill_client_name", data: { name: extracted.clientName } });
                    }
                    if (extracted.displays && Array.isArray(extracted.displays)) {
                        for (const d of extracted.displays) {
                            collected.displays.push(d);
                            actions.push({ type: "add_display", data: d });
                        }
                    }
                    if (extracted.prices && Array.isArray(extracted.prices)) {
                        for (let i = 0; i < extracted.prices.length; i++) {
                            const price = extracted.prices[i];
                            const idx = collected.displayPrices.length;
                            collected.displayPrices[idx] = price;
                            actions.push({ type: "set_display_price", data: { index: idx, price } });
                        }
                    }
                    if (extracted.services && Array.isArray(extracted.services)) {
                        for (const s of extracted.services) {
                            collected.services.push(s);
                            actions.push({ type: "add_service", data: s });
                        }
                    }
                    if (extracted.taxRate !== undefined) {
                        collected.taxRate = extracted.taxRate;
                        actions.push({ type: "set_tax", data: { rate: extracted.taxRate } });
                    }
                    if (extracted.bondRate !== undefined) {
                        collected.bondRate = extracted.bondRate;
                        actions.push({ type: "set_bond", data: { rate: extracted.bondRate } });
                    }
                    if (extracted.documentType) {
                        collected.documentType = extracted.documentType;
                        actions.push({ type: "generate_pdf", data: { type: extracted.documentType } });
                        nextStage = ConversationStage.DONE;
                    }
                }

                // Handle reset
                if (extracted?.reset) {
                    const fresh = createInitialState().collected;
                    return {
                        reply: content.replace(/```json[\s\S]*?```/, "").trim(),
                        actions: [],
                        nextStage: ConversationStage.CLIENT_NAME,
                        collected: fresh,
                    };
                }
            } catch (e) {
                console.warn("[Copilot/Propose] Failed to parse LLM JSON, using response as-is:", e);
            }
        }

        // Clean the reply — remove the JSON block from what the user sees
        let reply = content.replace(/```json[\s\S]*?```/, "").trim();
        if (!reply) reply = content.split("{")[0].trim() || "Got it.";

        return {
            reply,
            actions,
            nextStage,
            collected,
        };
    } catch (error) {
        console.error("[Copilot/Propose] LLM flow error:", error);
        return null; // Fall back to regex
    }
}

// ============================================================================
// HELPERS
// ============================================================================

async function getWorkspaceSlug(projectId: string | undefined): Promise<string | null> {
    if (!projectId || projectId === "new") return "dashboard-vault";
    try {
        const proposal = await prisma.proposal.findUnique({
            where: { id: projectId },
            select: { aiWorkspaceSlug: true, workspace: { select: { aiWorkspaceSlug: true } } },
        });
        return proposal?.aiWorkspaceSlug || proposal?.workspace?.aiWorkspaceSlug || "dashboard-vault";
    } catch {
        return "dashboard-vault";
    }
}
