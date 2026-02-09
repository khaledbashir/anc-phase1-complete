/**
 * Proposal Conversation Flow — State Machine
 * 
 * Guides the estimator through building a proposal conversationally.
 * Each stage has a question, expected input type, and parser.
 */

// ============================================================================
// TYPES
// ============================================================================

export enum ConversationStage {
    GREETING = "GREETING",
    CLIENT_NAME = "CLIENT_NAME",
    DISPLAYS = "DISPLAYS",
    DISPLAY_PRICING = "DISPLAY_PRICING",
    SERVICES = "SERVICES",
    PM_WARRANTY = "PM_WARRANTY",
    TAX_BOND = "TAX_BOND",
    REVIEW = "REVIEW",
    GENERATE = "GENERATE",
    DONE = "DONE",
}

export interface ParsedDisplay {
    description: string;
    widthM: number;
    heightM: number;
    pitchMm: number;
    quantity: number;
}

export interface ParsedServiceItem {
    description: string;
    price: number;
}

export interface CollectedData {
    clientName?: string;
    displays: ParsedDisplay[];
    displayPrices: number[];  // parallel to displays array
    services: ParsedServiceItem[];
    taxRate?: number;
    bondRate?: number;
    documentType?: "BUDGET" | "PROPOSAL" | "LOI";
}

export interface ConversationState {
    stage: ConversationStage;
    collected: CollectedData;
}

export interface StageAction {
    type:
        | "fill_client_name"
        | "add_display"
        | "set_display_price"
        | "add_service"
        | "set_tax"
        | "set_bond"
        | "generate_pdf";
    data: any;
}

export interface StageResult {
    reply: string;
    actions: StageAction[];
    nextStage: ConversationStage;
    collected: CollectedData;
    summary?: {
        displayCount: number;
        subtotal: number;
        tax: number;
        grandTotal: number;
    };
}

// ============================================================================
// PARSERS
// ============================================================================

/** Extract dollar amounts from text: "$213,690" → 213690 */
export function parseDollarAmounts(text: string): number[] {
    const matches = text.match(/\$[\d,]+(?:\.\d{1,2})?/g) || [];
    return matches.map((m) => parseFloat(m.replace(/[$,]/g, ""))).filter(Number.isFinite);
}

/** Extract percentage: "13% HST" → 0.13 */
export function parsePercentage(text: string): number | null {
    const match = text.match(/([\d.]+)\s*%/);
    if (!match) return null;
    const val = parseFloat(match[1]);
    return Number.isFinite(val) ? val / 100 : null;
}

/** Parse display descriptions from natural language */
export function parseDisplays(text: string): ParsedDisplay[] {
    const displays: ParsedDisplay[] = [];

    // Pattern: quantity + description + dimensions + pitch
    // "Two LED walls, 4.05m x 10.20m, 2.5mm pitch"
    // "One LED wall, 4.05m x 10.20m, 2.5mm"
    // "2x LED video wall 4.05 x 10.20m 2.5mm pitch"

    // Split on "and", ";", or newlines for multiple displays
    const segments = text.split(/\band\b|;|\n/i).map((s) => s.trim()).filter(Boolean);

    for (const seg of segments) {
        // Extract quantity
        let quantity = 1;
        const qtyMatch = seg.match(/^(\d+)\s*x?\s/i) || seg.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
        if (qtyMatch) {
            const wordMap: Record<string, number> = {
                one: 1, two: 2, three: 3, four: 4, five: 5,
                six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
            };
            quantity = wordMap[qtyMatch[1].toLowerCase()] || parseInt(qtyMatch[1]) || 1;
        }

        // Extract dimensions: "4.05m x 10.20m" or "4.05 x 10.20" or "4.05mx10.20m"
        const dimMatch = seg.match(/([\d.]+)\s*m?\s*[x×]\s*([\d.]+)\s*m?/i);
        if (!dimMatch) continue; // Skip if no dimensions found

        const dim1 = parseFloat(dimMatch[1]);
        const dim2 = parseFloat(dimMatch[2]);
        // Convention: smaller = height, larger = width (landscape)
        const widthM = Math.max(dim1, dim2);
        const heightM = Math.min(dim1, dim2);

        // Extract pitch: "2.5mm" or "2.5 mm pitch"
        const pitchMatch = seg.match(/([\d.]+)\s*mm/i);
        const pitchMm = pitchMatch ? parseFloat(pitchMatch[1]) : 0;

        // Build description
        const desc = seg
            .replace(/^\d+\s*x?\s*/i, "")
            .replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b\s*/i, "")
            .trim() || `LED Display ${widthM}m x ${heightM}m`;

        displays.push({
            description: desc,
            widthM,
            heightM,
            pitchMm,
            quantity,
        });
    }

    return displays;
}

/** Parse service items: "Installation $115,185, PM $12,500" */
export function parseServiceItems(text: string): ParsedServiceItem[] {
    const items: ParsedServiceItem[] = [];

    // Split on commas, semicolons, newlines, or "and"
    const segments = text.split(/[,;\n]|\band\b/i).map((s) => s.trim()).filter(Boolean);

    for (const seg of segments) {
        const amounts = parseDollarAmounts(seg);
        if (amounts.length === 0) continue;

        // Description is everything before the dollar sign
        const descMatch = seg.match(/^(.*?)\s*\$/);
        const description = descMatch ? descMatch[1].trim() : seg.replace(/\$[\d,.]+/, "").trim();

        items.push({
            description: description || "Service Item",
            price: amounts[0],
        });
    }

    return items;
}

// ============================================================================
// STAGE PROMPTS
// ============================================================================

const STAGE_PROMPTS: Record<ConversationStage, string> = {
    [ConversationStage.GREETING]:
        "Hey! Let's build this proposal. What client is this for?",
    [ConversationStage.CLIENT_NAME]:
        "What client is this proposal for?",
    [ConversationStage.DISPLAYS]:
        "What displays are we quoting? Include dimensions (e.g. 4.05m x 10.20m), pixel pitch (e.g. 2.5mm), and quantity.",
    [ConversationStage.DISPLAY_PRICING]:
        "", // Dynamic — depends on display count
    [ConversationStage.SERVICES]:
        "What about installation, structural, and electrical costs? (e.g. \"Structural $114,625, Labor $183,199, Electrical $249,432\")",
    [ConversationStage.PM_WARRANTY]:
        "Project management, engineering, warranty? (e.g. \"PM $12,500, Engineering $69,513, Warranty $23,403\")",
    [ConversationStage.TAX_BOND]:
        "Tax rate? Bond rate? (e.g. \"13% HST\" or \"8.25% tax, 2% bond\")",
    [ConversationStage.REVIEW]:
        "", // Dynamic — shows summary
    [ConversationStage.GENERATE]:
        "What document type? Budget estimate, formal proposal, or LOI?",
    [ConversationStage.DONE]:
        "All done! Your PDF is being generated.",
};

export function getStagePrompt(stage: ConversationStage, collected: CollectedData): string {
    if (stage === ConversationStage.DISPLAY_PRICING) {
        const count = collected.displays.length;
        if (count === 1) {
            return `Got ${count} display added. What's the selling price?`;
        }
        return `Got ${count} displays added. What's the pricing on each? (e.g. "$213,690 each for the big ones, $41,948 for the small one")`;
    }

    if (stage === ConversationStage.REVIEW) {
        return buildReviewSummary(collected);
    }

    return STAGE_PROMPTS[stage] || "";
}

function buildReviewSummary(collected: CollectedData): string {
    const displayTotal = collected.displayPrices.reduce((sum, p) => sum + p, 0);
    const serviceTotal = collected.services.reduce((sum, s) => sum + s.price, 0);
    const subtotal = displayTotal + serviceTotal;
    const taxAmt = subtotal * (collected.taxRate || 0);
    const bondAmt = subtotal * (collected.bondRate || 0);
    const grandTotal = subtotal + taxAmt + bondAmt;

    const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let summary = `Here's your summary:\n`;
    summary += `• Client: ${collected.clientName || "—"}\n`;
    summary += `• ${collected.displays.length} display(s)\n`;
    summary += `• ${collected.services.length} service item(s)\n`;
    summary += `• Subtotal: ${fmt(subtotal)}\n`;
    if (collected.taxRate) summary += `• Tax (${(collected.taxRate * 100).toFixed(1)}%): ${fmt(taxAmt)}\n`;
    if (collected.bondRate) summary += `• Bond (${(collected.bondRate * 100).toFixed(1)}%): ${fmt(bondAmt)}\n`;
    summary += `• Grand Total: ${fmt(grandTotal)}\n\n`;
    summary += `Ready to generate? Say "budget estimate", "proposal", or "LOI".`;

    return summary;
}

// ============================================================================
// STAGE PROCESSOR
// ============================================================================

export function processStage(
    stage: ConversationStage,
    message: string,
    collected: CollectedData
): StageResult {
    const text = message.trim();
    const actions: StageAction[] = [];
    let nextStage = stage;
    let reply = "";

    switch (stage) {
        case ConversationStage.GREETING:
        case ConversationStage.CLIENT_NAME: {
            // Any non-empty text is the client name
            const clientName = text.replace(/^(it's|its|for)\s+/i, "").trim();
            collected.clientName = clientName;
            actions.push({ type: "fill_client_name", data: { name: clientName } });
            reply = `Got it — ${clientName}. ${getStagePrompt(ConversationStage.DISPLAYS, collected)}`;
            nextStage = ConversationStage.DISPLAYS;
            break;
        }

        case ConversationStage.DISPLAYS: {
            const displays = parseDisplays(text);
            if (displays.length === 0) {
                reply = "I couldn't parse display specs from that. Try something like: \"One LED wall, 4.05m x 10.20m, 2.5mm pitch\"";
                break;
            }
            collected.displays.push(...displays);
            for (const d of displays) {
                actions.push({ type: "add_display", data: d });
            }
            reply = getStagePrompt(ConversationStage.DISPLAY_PRICING, collected);
            nextStage = ConversationStage.DISPLAY_PRICING;
            break;
        }

        case ConversationStage.DISPLAY_PRICING: {
            const prices = parseDollarAmounts(text);
            if (prices.length === 0) {
                reply = "I need dollar amounts for the displays. Try: \"$213,690 each\" or \"$213,690 for the big ones, $41,948 for the small one\"";
                break;
            }

            // If "each" is mentioned and only one price, apply to all
            if (prices.length === 1 && /each|all|per/i.test(text)) {
                for (let i = 0; i < collected.displays.length; i++) {
                    collected.displayPrices[i] = prices[0];
                    actions.push({ type: "set_display_price", data: { index: i, price: prices[0] } });
                }
            } else {
                // Map prices to displays in order
                for (let i = 0; i < Math.min(prices.length, collected.displays.length); i++) {
                    collected.displayPrices[i] = prices[i];
                    actions.push({ type: "set_display_price", data: { index: i, price: prices[i] } });
                }
            }

            reply = `Prices set. ${getStagePrompt(ConversationStage.SERVICES, collected)}`;
            nextStage = ConversationStage.SERVICES;
            break;
        }

        case ConversationStage.SERVICES: {
            const services = parseServiceItems(text);
            if (services.length === 0) {
                reply = "I need service items with prices. Try: \"Installation $115,185, Structural $114,625\"";
                break;
            }
            collected.services.push(...services);
            for (const s of services) {
                actions.push({ type: "add_service", data: s });
            }
            reply = `${services.length} service item(s) added. ${getStagePrompt(ConversationStage.PM_WARRANTY, collected)}`;
            nextStage = ConversationStage.PM_WARRANTY;
            break;
        }

        case ConversationStage.PM_WARRANTY: {
            const services = parseServiceItems(text);
            if (services.length === 0) {
                // Allow skipping
                if (/skip|none|no|n\/a/i.test(text)) {
                    reply = getStagePrompt(ConversationStage.TAX_BOND, collected);
                    nextStage = ConversationStage.TAX_BOND;
                    break;
                }
                reply = "I need items with prices, or say \"skip\" to move on. Try: \"PM $12,500, Engineering $69,513\"";
                break;
            }
            collected.services.push(...services);
            for (const s of services) {
                actions.push({ type: "add_service", data: s });
            }
            reply = `Added. ${getStagePrompt(ConversationStage.TAX_BOND, collected)}`;
            nextStage = ConversationStage.TAX_BOND;
            break;
        }

        case ConversationStage.TAX_BOND: {
            const pct = parsePercentage(text);
            if (pct === null) {
                if (/skip|none|no|n\/a|0/i.test(text)) {
                    nextStage = ConversationStage.REVIEW;
                    reply = getStagePrompt(ConversationStage.REVIEW, collected);
                    break;
                }
                reply = "I need a percentage. Try: \"13% HST\" or \"8.25% tax, 2% bond\"";
                break;
            }

            // Check if there's a bond rate too
            const allPcts = text.match(/([\d.]+)\s*%/g) || [];
            if (allPcts.length >= 2) {
                const vals = allPcts.map((m) => parseFloat(m) / 100);
                collected.taxRate = vals[0];
                collected.bondRate = vals[1];
                actions.push({ type: "set_tax", data: { rate: vals[0] } });
                actions.push({ type: "set_bond", data: { rate: vals[1] } });
            } else {
                // Determine if it's tax or bond based on keywords
                if (/bond|performance/i.test(text)) {
                    collected.bondRate = pct;
                    actions.push({ type: "set_bond", data: { rate: pct } });
                } else {
                    collected.taxRate = pct;
                    actions.push({ type: "set_tax", data: { rate: pct } });
                }
            }

            nextStage = ConversationStage.REVIEW;
            reply = getStagePrompt(ConversationStage.REVIEW, collected);
            break;
        }

        case ConversationStage.REVIEW: {
            // Parse document type from response
            if (/budget/i.test(text)) {
                collected.documentType = "BUDGET";
            } else if (/proposal|formal|quote/i.test(text)) {
                collected.documentType = "PROPOSAL";
            } else if (/loi|letter/i.test(text)) {
                collected.documentType = "LOI";
            } else if (/yes|yeah|yep|sure|go|ready|generate/i.test(text)) {
                collected.documentType = "BUDGET"; // Default
            } else {
                reply = "Say \"budget estimate\", \"proposal\", or \"LOI\" to generate.";
                break;
            }

            actions.push({ type: "generate_pdf", data: { documentType: collected.documentType } });
            nextStage = ConversationStage.DONE;
            reply = `Generating ${collected.documentType === "BUDGET" ? "Budget Estimate" : collected.documentType === "PROPOSAL" ? "Formal Proposal" : "Letter of Intent"}... Your PDF will download shortly.`;
            break;
        }

        case ConversationStage.DONE: {
            reply = "The proposal has been generated! Create a new project to start another, or ask me anything about this one.";
            break;
        }

        default:
            reply = "Something went wrong with the conversation flow. Try again.";
    }

    return { reply, actions, nextStage, collected };
}

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialState(): ConversationState {
    return {
        stage: ConversationStage.GREETING,
        collected: {
            displays: [],
            displayPrices: [],
            services: [],
        },
    };
}

/** Check if a message is off-topic (not related to the current stage) */
export function isOffTopic(stage: ConversationStage, message: string): boolean {
    const text = message.toLowerCase().trim();

    // General questions that should go to AnythingLLM
    const offTopicPatterns = [
        /^(what|how|why|when|where|who|can you|tell me|explain)/,
        /^(search|find|look up)/,
        /\?$/,
        /^@agent/,
    ];

    // Don't flag as off-topic during greeting/client name (anything is valid)
    if (stage === ConversationStage.GREETING || stage === ConversationStage.CLIENT_NAME) {
        return false;
    }

    // Don't flag during review (yes/no/generate are valid)
    if (stage === ConversationStage.REVIEW || stage === ConversationStage.DONE) {
        return false;
    }

    return offTopicPatterns.some((p) => p.test(text));
}
