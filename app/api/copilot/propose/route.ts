import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { prisma } from "@/lib/prisma";
import {
    ConversationStage,
    createInitialState,
} from "@/services/chat/proposalConversationFlow";
import type { CollectedData, StageAction } from "@/services/chat/proposalConversationFlow";

/**
 * POST /api/copilot/propose
 *
 * LLM-powered guided conversation for building proposals.
 * Every message goes through AnythingLLM with a stage-aware system prompt.
 * The LLM responds naturally AND returns structured JSON for form actions.
 * Returns 503 if AnythingLLM is unavailable — no fake fallbacks.
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

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            const missing = [
                !ANYTHING_LLM_BASE_URL && "ANYTHING_LLM_URL",
                !ANYTHING_LLM_KEY && "ANYTHING_LLM_KEY",
            ].filter(Boolean);
            console.error(`[Copilot/Propose] Missing env vars: ${missing.join(", ")}`);
            return NextResponse.json({
                reply: `AI backend not configured: ${missing.join(", ")} missing. Contact admin.`,
                actions: [], nextStage: stage, collected,
            }, { status: 503 });
        }

        if (!workspaceSlug) {
            console.error(`[Copilot/Propose] No workspace slug for project ${projectId}`);
            return NextResponse.json({
                reply: "No AI workspace found for this project. Try saving the project first.",
                actions: [], nextStage: stage, collected,
            }, { status: 503 });
        }

        console.log(`[Copilot/Propose] projectId=${projectId || "none"}, slug=${workspaceSlug}, stage=${stage}`);

        // ---- DEMO MODE: detect bulk input and parse everything at once ----
        if (isBulkInput(message) && stage !== ConversationStage.REVIEW && stage !== ConversationStage.DONE) {
            console.log("[Copilot/Propose] Bulk input detected — activating demo mode");
            const bulkResult = await bulkExtract(workspaceSlug, projectId, message, collected);
            if (bulkResult) {
                return NextResponse.json(bulkResult);
            }
        }

        // ---- Normal LLM-powered guided flow ----
        const llmResult = await llmGuidedFlow(workspaceSlug, projectId, stage, message, collected);
        if (llmResult) {
            return NextResponse.json(llmResult);
        }

        // LLM was reachable but returned an error
        console.error(`[Copilot/Propose] llmGuidedFlow returned null for slug=${workspaceSlug}`);
        return NextResponse.json({
            reply: "AI responded with an error. The workspace may need its LLM model configured. Try again or contact admin.",
            actions: [], nextStage: stage, collected,
        }, { status: 502 });
    } catch (error: any) {
        console.error("[Copilot/Propose] Error:", error);
        return NextResponse.json({
            error: error.message,
            reply: `Error: ${error.message}`,
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
    // Build display summary for context
    const displayList = collected.displays.length > 0
        ? collected.displays.map((d, i) => {
            const price = collected.displayPrices[i];
            return `  Display ${i + 1}: ${d.widthM}m × ${d.heightM}m${d.pitchMm ? `, ${d.pitchMm}mm pitch` : ""}${price ? ` — $${price.toLocaleString()}` : ""}`;
        }).join("\n")
        : "  (none yet)";

    const serviceList = collected.services.length > 0
        ? collected.services.map(s => `  ${s.description}: $${s.price.toLocaleString()}`).join("\n")
        : "  (none yet)";

    return `You are an AI copilot helping an ANC Sports estimator build an LED display proposal. You are a confident, knowledgeable colleague — not a form, not a chatbot.

PERSONALITY:
- Be confident and direct. Fill fields immediately when you understand the intent.
- NEVER ask "Is that correct?" or "Can you confirm?" — just do it and tell them what you did.
- If something seems off, fix it and say what you changed.
- Keep responses to 1-2 sentences. You're fast-paced, not chatty.
- You can banter briefly but always keep momentum toward finishing the proposal.

CURRENT STAGE: ${stage}
STAGE ORDER: CLIENT_NAME → DISPLAYS → DISPLAY_PRICING → SERVICES → PM_WARRANTY → TAX_BOND → REVIEW

WHAT'S BEEN COLLECTED:
- Client: ${collected.clientName || "(not set)"}
- Displays:\n${displayList}
- Services:\n${serviceList}
- Tax: ${collected.taxRate ? `${(collected.taxRate * 100).toFixed(1)}%` : "(not set)"}
- Bond: ${collected.bondRate ? `${(collected.bondRate * 100).toFixed(1)}%` : "(not set)"}

BEHAVIOR BY STAGE:
- GREETING/CLIENT_NAME: Get the client name. "Dallas Cowboys" → fill it, move to DISPLAYS.
- DISPLAYS: Extract dimensions (width × height), pixel pitch (mm), quantity, description. Accept meters or feet. If they say "4m x 10m, 2.5mm" → fill it, say "Added 4m × 10m display at 2.5mm pitch. What's the sell price?" and move to DISPLAY_PRICING.
- DISPLAY_PRICING: Get dollar amount(s). "$200k" → fill $200,000, say "Set at $200,000. Services?" and move to SERVICES.
- SERVICES: Get service name + price pairs. "Installation $115k, Structural $114k" → fill both, move to PM_WARRANTY.
- PM_WARRANTY: Get PM/engineering/warranty costs. "Skip" is fine → move to TAX_BOND.
- TAX_BOND: Get percentages. "13% HST" → fill 13% tax, move to REVIEW.
- REVIEW: Show final summary with totals. This is the ONLY place you ask for confirmation: "Ready to generate? Budget estimate, formal proposal, or LOI?"

CORRECTIONS:
The user can correct ANY previously filled field at ANY time by saying things like:
- "no it's 213,690" → update the most recent relevant field
- "change the client to Lakers" → update clientName
- "make display 1 price 300k" → update that specific display price
- "remove structural" → remove that service
When correcting, include a "corrections" array in your JSON (see format below).

RESPONSE FORMAT — always end with a JSON block:
\`\`\`json
{
  "extracted": { ... },
  "corrections": [],
  "nextStage": "SERVICES"
}
\`\`\`

EXTRACTED SCHEMAS:
- CLIENT_NAME stage: { "clientName": "Dallas Cowboys" }
- DISPLAYS stage: { "displays": [{ "description": "LED wall", "widthM": 4.05, "heightM": 10.20, "pitchMm": 2.5, "quantity": 1 }] }
- DISPLAY_PRICING stage: { "prices": [200000] }
- SERVICES/PM_WARRANTY stage: { "services": [{ "description": "Installation", "price": 115000 }] }
- TAX_BOND stage: { "taxRate": 0.13, "bondRate": 0.02 }
- REVIEW stage: { "documentType": "BUDGET" | "PROPOSAL" | "LOI" }

CORRECTIONS SCHEMA (use when user corrects a previous field):
[
  { "field": "clientName", "value": "New Name" },
  { "field": "displayPrice", "index": 0, "value": 213690 },
  { "field": "service", "index": 1, "value": { "description": "Structural", "price": 120000 } },
  { "field": "removeService", "index": 2 },
  { "field": "taxRate", "value": 0.0825 }
]

If the user is off-topic, answer briefly and get back to the current stage. Never set "extracted": null if you can extract ANYTHING useful — be aggressive about parsing.
If the user says "skip" → advance nextStage, extracted can be null.
If the user says "go back" → set nextStage to the previous stage.
If the user says "start over" → set "extracted": { "reset": true }, "nextStage": "CLIENT_NAME".`;
}

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
            const errBody = await res.text().catch(() => "");
            console.error(`[Copilot/Propose] LLM error ${res.status} for slug=${workspaceSlug}: ${errBody.slice(0, 300)}`);
            return null;
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

                // ---- Process corrections first (user said "no, change X") ----
                const corrections = parsed.corrections;
                if (Array.isArray(corrections) && corrections.length > 0) {
                    for (const c of corrections) {
                        switch (c.field) {
                            case "clientName":
                                collected.clientName = c.value;
                                actions.push({ type: "fill_client_name", data: { name: c.value } });
                                break;
                            case "displayPrice":
                                if (typeof c.index === "number" && c.index < collected.displayPrices.length) {
                                    collected.displayPrices[c.index] = c.value;
                                    actions.push({ type: "set_display_price", data: { index: c.index, price: c.value } });
                                }
                                break;
                            case "service":
                                if (typeof c.index === "number" && c.index < collected.services.length) {
                                    collected.services[c.index] = c.value;
                                    actions.push({ type: "update_service", data: { index: c.index, ...c.value } });
                                }
                                break;
                            case "removeService":
                                if (typeof c.index === "number" && c.index < collected.services.length) {
                                    const removed = collected.services.splice(c.index, 1)[0];
                                    actions.push({ type: "remove_service", data: { index: c.index, description: removed?.description } });
                                }
                                break;
                            case "taxRate":
                                collected.taxRate = c.value;
                                actions.push({ type: "set_tax", data: { rate: c.value } });
                                break;
                            case "bondRate":
                                collected.bondRate = c.value;
                                actions.push({ type: "set_bond", data: { rate: c.value } });
                                break;
                        }
                    }
                }

                // ---- Process new extracted data ----
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

                // ---- Handle reset ----
                if (extracted?.reset) {
                    const fresh = createInitialState().collected;
                    return {
                        reply: content.replace(/```json[\s\S]*?```/, "").trim(),
                        actions: [{ type: "reset", data: {} }],
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
// DEMO MODE — BULK EXTRACTION
// ============================================================================

/**
 * Heuristic: does this message contain data from 3+ categories?
 * Categories: client name (text), dimensions (NxN), prices ($), services (keywords), tax (%).
 */
function isBulkInput(message: string): boolean {
    let score = 0;
    const t = message.toLowerCase();
    // Has dimensions (NxN pattern)
    if (/\d+\.?\d*\s*[xX×]\s*\d+/.test(message)) score++;
    // Has dollar amounts or price keywords
    if (/\$[\d,]+|[\d,]+k\b|\d+\s*(thousand|million)/i.test(message)) score++;
    // Has service keywords
    if (/install|structural|electrical|rigging|labor|pm\b|engineer|warranty/i.test(t)) score++;
    // Has tax/percentage
    if (/\d+\.?\d*\s*%/.test(message)) score++;
    // Has what looks like a client/venue name (starts with a proper noun before technical data)
    if (/^[A-Z][a-z]/.test(message.trim()) || /for\s+[A-Z]/i.test(message)) score++;
    // Minimum 3 categories to trigger bulk mode
    return score >= 3;
}

const BULK_SYSTEM_PROMPT = `You are an AI data extractor for ANC Sports LED display proposals. The user will give you a single message containing proposal details. Extract EVERYTHING into structured JSON.

RESPOND WITH ONLY A JSON BLOCK — no conversational text before it.

\`\`\`json
{
  "clientName": "string or null",
  "displays": [
    {
      "description": "string (e.g. 'LED Wall', 'Fascia Board')",
      "widthM": number,
      "heightM": number,
      "pitchMm": number or null,
      "quantity": number,
      "price": number or null
    }
  ],
  "services": [
    { "description": "string", "price": number }
  ],
  "taxRate": number or null (as decimal, e.g. 0.13 for 13%),
  "bondRate": number or null (as decimal)
}
\`\`\`

PARSING RULES:
- "two at 4x10m 2.5mm for 213k each" → TWO separate display objects, each with price 213000
- "200k" = 200000, "$1.5M" = 1500000, "42k" = 42000
- Accept meters OR feet. If feet, convert: 1ft = 0.3048m (round to 2 decimals)
- "PM $12,500" → service: { description: "Project Management", price: 12500 }
- "13% HST" or "13% tax" → taxRate: 0.13
- "2% bond" → bondRate: 0.02
- If quantity > 1 and "each" price given, create that many individual display objects each with that price
- Be aggressive — extract everything you can. Do NOT leave fields null if you can infer them.`;

async function bulkExtract(
    workspaceSlug: string,
    projectId: string | undefined,
    message: string,
    collected: CollectedData,
): Promise<any | null> {
    try {
        const fullMessage = `[System Context: ${BULK_SYSTEM_PROMPT}]\n\nExtract from this message:\n"${message}"`;

        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message: fullMessage,
                mode: "chat",
                sessionId: `bulk-${projectId || "new"}`,
            }),
        });

        if (!res.ok) {
            console.error("[Copilot/Propose] Bulk extract LLM error:", res.status);
            return null;
        }

        const data = await res.json();
        let content = data.textResponse || data.response || "";

        // Strip <think> tags
        if (content.includes("<think>")) {
            content = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
        }

        // Extract JSON
        const jsonMatch = content.match(/```json\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*"displays"[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("[Copilot/Propose] Bulk extract: no JSON found in response");
            return null; // Fall through to normal guided flow
        }

        const jsonStr = jsonMatch[1] || jsonMatch[0];
        const parsed = JSON.parse(jsonStr);

        // Build actions + update collected
        const actions: StageAction[] = [];
        const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        const summaryLines: string[] = [];

        // Client
        if (parsed.clientName) {
            collected.clientName = parsed.clientName;
            actions.push({ type: "fill_client_name", data: { name: parsed.clientName } });
            summaryLines.push(`Client: **${parsed.clientName}**`);
        }

        // Displays
        if (Array.isArray(parsed.displays)) {
            for (const d of parsed.displays) {
                const qty = d.quantity || 1;
                for (let q = 0; q < qty; q++) {
                    const display = {
                        description: d.description || "LED Display",
                        widthM: d.widthM,
                        heightM: d.heightM,
                        pitchMm: d.pitchMm || null,
                        quantity: 1,
                    };
                    collected.displays.push(display);
                    actions.push({ type: "add_display", data: display });

                    const idx = collected.displayPrices.length;
                    if (d.price) {
                        collected.displayPrices[idx] = d.price;
                        actions.push({ type: "set_display_price", data: { index: idx, price: d.price } });
                        summaryLines.push(`Display ${idx + 1}: ${d.widthM}m × ${d.heightM}m${d.pitchMm ? ` @ ${d.pitchMm}mm` : ""} — ${fmt(d.price)}`);
                    } else {
                        summaryLines.push(`Display ${idx + 1}: ${d.widthM}m × ${d.heightM}m${d.pitchMm ? ` @ ${d.pitchMm}mm` : ""} — (no price)`);
                    }
                }
            }
        }

        // Services
        if (Array.isArray(parsed.services)) {
            for (const s of parsed.services) {
                collected.services.push(s);
                actions.push({ type: "add_service", data: s });
                summaryLines.push(`Service: ${s.description} — ${fmt(s.price)}`);
            }
        }

        // Tax
        if (parsed.taxRate !== undefined && parsed.taxRate !== null) {
            collected.taxRate = parsed.taxRate;
            actions.push({ type: "set_tax", data: { rate: parsed.taxRate } });
            summaryLines.push(`Tax: ${(parsed.taxRate * 100).toFixed(1)}%`);
        }

        // Bond
        if (parsed.bondRate !== undefined && parsed.bondRate !== null) {
            collected.bondRate = parsed.bondRate;
            actions.push({ type: "set_bond", data: { rate: parsed.bondRate } });
            summaryLines.push(`Bond: ${(parsed.bondRate * 100).toFixed(1)}%`);
        }

        // Calculate totals
        const displayTotal = collected.displayPrices.reduce((sum, p) => sum + (p || 0), 0);
        const serviceTotal = collected.services.reduce((sum, s) => sum + s.price, 0);
        const subtotal = displayTotal + serviceTotal;
        const taxAmt = subtotal * (collected.taxRate || 0);
        const bondAmt = subtotal * (collected.bondRate || 0);
        const grandTotal = subtotal + taxAmt + bondAmt;

        // Build the summary reply
        let reply = `Done — filled everything in one shot.\n\n`;
        reply += summaryLines.join("\n") + "\n\n";
        reply += `**Subtotal: ${fmt(subtotal)}**`;
        if (collected.taxRate) reply += ` + Tax ${fmt(taxAmt)}`;
        if (collected.bondRate) reply += ` + Bond ${fmt(bondAmt)}`;
        reply += `\n**Grand Total: ${fmt(grandTotal)}**\n\n`;
        reply += `Check the preview — if anything looks off, just tell me what to change. Otherwise, say **"generate budget estimate"**, **"proposal"**, or **"LOI"**.`;

        console.log(`[Copilot/Propose] Bulk extract: ${actions.length} actions, ${summaryLines.length} items, total ${fmt(grandTotal)}`);

        return {
            reply,
            actions,
            nextStage: ConversationStage.REVIEW,
            collected,
            bulk: true,
        };
    } catch (error) {
        console.error("[Copilot/Propose] Bulk extract error:", error);
        return null; // Fall through to normal flow
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
