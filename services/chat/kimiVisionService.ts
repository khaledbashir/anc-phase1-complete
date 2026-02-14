/**
 * Kimi Vision Service — Client-Side Only
 *
 * Sends screenshots + user messages to Kimi K2.5 vision model via Puter.js.
 * Returns conversational replies + executable screen actions.
 *
 * This is the "eyes + hands" brain of the copilot:
 * - SEES the screen (via screenshot)
 * - UNDERSTANDS natural language commands
 * - EMITS structured actions that modify the form
 */

// Puter.js types are declared globally in KimiVision.tsx — no duplicate needed here.
// We access window.puter directly.

export interface KimiScreenAction {
    type: string; // 'set_field' | 'set_document_mode' | 'navigate_step' | 'download_pdf' | 'append_text' | 'fix_section_header'
    field?: string;
    value?: any;
    sectionIndex?: number;
    reason?: string;
}

export interface KimiResponse {
    reply: string;
    actions: KimiScreenAction[];
}

let puterLoadPromise: Promise<void> | null = null;

async function ensurePuterLoaded(): Promise<void> {
    if (typeof window === "undefined") {
        throw new Error("Puter is client-side only");
    }

    if (window.puter) return;

    if (!puterLoadPromise) {
        puterLoadPromise = new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector<HTMLScriptElement>(
                'script[src="https://js.puter.com/v2/"]'
            );
            if (existingScript) {
                existingScript.addEventListener("load", () => resolve(), { once: true });
                existingScript.addEventListener("error", () => reject(new Error("Failed to load Puter.js")), { once: true });
                return;
            }

            const script = document.createElement("script");
            script.src = "https://js.puter.com/v2/";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Puter.js"));
            document.body.appendChild(script);
        });
    }

    await puterLoadPromise;
}

const KIMI_SYSTEM_PROMPT = `You are the ANC Proposal Engine copilot. You help users build LED display proposals.

You can SEE the user's screen. A screenshot is attached to every message.

== YOUR CAPABILITIES ==
You can modify the proposal by returning actions. After your conversational reply, ALWAYS include a JSON block if ANY changes are needed:

\`\`\`json
{
  "actions": [
    { "type": "set_field", "field": "clientName", "value": "Denver" },
    { "type": "set_document_mode", "value": "LOI" },
    { "type": "navigate_step", "value": 2 }
  ]
}
\`\`\`

== AVAILABLE ACTIONS ==

set_field — Change any form field:
  Client: clientName, clientAddress, clientCity, clientCountry, clientZip, clientEmail, clientPhone
  Sender: senderName, senderAddress, senderCity, senderCountry, senderEmail, senderPhone
  Document: proposalName, location, currency, language, proposalDate, dueDate, purchaseOrderNumber, venue
  Text: introductionText, paymentTerms, signatureBlockText, additionalNotes, customProposalNotes, loiHeaderText, scopeOfWorkText, specsSectionTitle
  Rates: taxRateOverride (decimal e.g. 0.095), bondRateOverride, insuranceRateOverride, overheadRate, profitRate, globalMargin
  Signer: signerName, signerTitle
  PDF Toggles (boolean true/false): showPricingTables, showIntroText, showSpecifications, showPaymentTerms, showSignatureBlock, showNotes, showScopeOfWork, showCompanyFooter, showAssumptions, showExhibitA, showExhibitB, showBaseBidTable, includePricingBreakdown

== CRITICAL FIELD MAPPING — READ CAREFULLY ==
When the user says "city" they mean clientCity (the client's city field), NOT venue.
When the user says "address" they mean clientAddress, NOT location.
When the user says "zip" or "zip code" they mean clientZip.
When the user says "name" or "client" they mean clientName.
When the user says "project name" they mean proposalName.
"venue" is a SEPARATE field — only use it when the user explicitly says "venue" or "stadium" or "arena".
"location" is a SEPARATE field — only use it when the user explicitly says "location".

set_document_mode — Switch document type:
  Values: "BUDGET", "PROPOSAL", "LOI"

navigate_step — Move wizard:
  Values: 0 (Setup), 1 (Configure), 2 (Math), 3 (Export)

download_pdf — Trigger PDF export (no value needed)

append_text — Append text to a field instead of replacing:
  { "type": "append_text", "field": "additionalNotes", "value": "New note here" }

fix_section_header — Fix a typo in a pricing section header:
  { "type": "fix_section_header", "sectionIndex": 2, "value": "Corrected Name" }

add_screen — Add a display screen to the project:
  From natural language: { "type": "add_screen", "value": "Concourse display 280 by 9 feet 4mm" }
  From structured data: { "type": "add_screen", "value": { "name": "Concourse", "widthFt": 280, "heightFt": 9, "pitchMm": 4, "quantity": 1 } }
  Parse user requests like "add a concourse display 280x9 ft 4mm" or "new screen PATH Hall 90ft wide 18ft tall 4mm"

list_screens — List all configured screens:
  { "type": "list_screens" }

remove_screen — Remove a screen by name or index (1-based):
  { "type": "remove_screen", "value": "Concourse" }
  { "type": "remove_screen", "value": 2 }

== MIRROR MODE RULES ==
Look at the screen. If you see pricing tables with data from an Excel upload, this is Mirror Mode:
- You CAN change: client name, project name, intro text, payment terms, notes, doc type, section headers
- You CANNOT change: prices, subtotals, margins, tax amounts, bond amounts, grand total, line item amounts
- If user asks to change a price: "In Mirror Mode, prices come from your Excel. Update the Excel and re-upload."

== COMPOUND COMMANDS ==
Users will say things like: "Change the client to Denver, switch to LOI, and add a note saying preliminary only"
You MUST emit ALL actions in a single response. Multiple actions in the actions array.

== CONTEXTUAL FOLLOW-UPS ==
Users will say: "do the same for project name" or "same thing" or "that too for the address"
Look at the conversation history to understand what "the same" means and emit the right action.

== READING THE SCREEN ==
The screenshot shows you the actual form and preview. Use it for LAYOUT and VISUAL context.
However, for exact field values, ALWAYS trust the "CURRENT FIELD VALUES" text block attached to each message.
The text block contains the real form data read directly from the DOM — it is 100% accurate.
The screenshot may be blurry or hard to read — NEVER guess field values from the image alone.
Use the screenshot to understand: which step the user is on, what sections are visible, the general layout.
Use the text block to know: exact field values, what's filled vs empty, current document mode.

== ANC BUSINESS KNOWLEDGE ==
ANC Sports Enterprises designs, prices, installs LED displays for stadiums/arenas.
Primary manufacturers: LG and Yaham.
Address: 2 Manhattanville Road, Suite 402, Purchase, NY 10577

Typical line items: LED Product Cost (35-50%), Structural Materials (15-25%), Structural Labor,
Electrical, Installation Labor (10-15%), CMS/Controls (3-8%), Design Services (3-5%),
Project Management (5-8%), Freight/Shipping, Warranty.

Three document types:
- Budget Estimate: header + pricing tables + specs. No signatures.
- Sales Quotation (Proposal): same layout, different header. No signatures.
- LOI: Legal header with addresses, project summary, payment terms, signatures, exhibits, detailed pricing.

== PERSONALITY ==
Be concise. Be helpful. Don't repeat back everything the user said. Just do it and confirm briefly.
If user says "hey" — say hey back, don't launch into a feature list.
When you make changes, confirm with something short like "Done — client name updated to Denver."
For compound actions: "Done — updated client to Denver, switched to LOI, added preliminary note."`;

/**
 * Send a message + screenshot to Kimi K2.5 vision via Puter.js.
 * Returns a conversational reply + any executable screen actions.
 */
export async function askKimiWithVision(
    userMessage: string,
    screenshotBase64: string,
    conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
    fieldValues?: Record<string, any>
): Promise<KimiResponse> {
    try {
        await ensurePuterLoaded();
    } catch (err: any) {
        return {
            reply: `Vision model unavailable: ${err?.message || String(err)}.`,
            actions: [],
        };
    }

    if (!window.puter) {
        console.error("[Kimi] Puter.js not loaded");
        return {
            reply: "Vision model not available — Puter.js hasn't loaded yet. Try again in a moment.",
            actions: [],
        };
    }

    // Build messages array with conversation history
    const messages: any[] = [
        { role: "system", content: KIMI_SYSTEM_PROMPT },
    ];

    // Add last 10 messages of conversation history (text only, no images for history)
    const recentHistory = conversationHistory.slice(-10);
    for (const msg of recentHistory) {
        messages.push({ role: msg.role, content: msg.content });
    }

    // Build the text part: user message + ground truth field values
    let textContent = userMessage;
    if (fieldValues && Object.keys(fieldValues).length > 0) {
        const fieldLines = Object.entries(fieldValues)
            .filter(([_, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => `  ${k}: ${v}`)
            .join("\n");
        const emptyFields = Object.entries(fieldValues)
            .filter(([_, v]) => v === undefined || v === null || v === "")
            .map(([k]) => k)
            .join(", ");
        textContent += `\n\n--- CURRENT FIELD VALUES (ground truth, trust this over the screenshot) ---\n${fieldLines || "(all fields empty)"}${emptyFields ? `\nEmpty fields: ${emptyFields}` : ""}`;
    }

    // Add current message WITH screenshot
    messages.push({
        role: "user",
        content: [
            {
                type: "image_url",
                image_url: { url: screenshotBase64 },
            },
            {
                type: "text",
                text: textContent,
            },
        ],
    });

    try {
        const response = await window.puter.ai.chat(messages, {
            model: "moonshotai/kimi-k2.5",
        });

        const rawContent =
            response?.message?.content || response?.content || response?.toString?.() || "";

        // Extract actions from JSON block if present
        const actions = extractActions(rawContent);
        console.log("[Kimi] Raw response:", rawContent);
        console.log("[Kimi] Extracted actions:", JSON.stringify(actions, null, 2));

        // Clean reply — remove the JSON block from display text
        const reply = rawContent
            .replace(/```json\s*\{[\s\S]*?\}\s*```/g, "")
            .replace(/```\s*\{[\s\S]*?"actions"[\s\S]*?\}\s*```/g, "")
            .trim();

        return { reply: reply || "Done.", actions };
    } catch (error: any) {
        console.error("[Kimi] Vision error:", error);
        return {
            reply: `Vision model error: ${error?.message || String(error)}. Try again.`,
            actions: [],
        };
    }
}

/**
 * Extract structured actions from Kimi's response text.
 * Looks for JSON blocks containing an "actions" array.
 */
function extractActions(content: string): KimiScreenAction[] {
    try {
        // Try to find JSON block in markdown code fence
        const fenceMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (fenceMatch) {
            const parsed = JSON.parse(fenceMatch[1]);
            if (parsed.actions && Array.isArray(parsed.actions)) {
                return parsed.actions;
            }
        }

        // Try to find raw JSON with actions array
        const rawMatch = content.match(/\{[\s\S]*?"actions"\s*:\s*\[[\s\S]*?\]\s*\}/);
        if (rawMatch) {
            const parsed = JSON.parse(rawMatch[0]);
            if (parsed.actions && Array.isArray(parsed.actions)) {
                return parsed.actions;
            }
        }
    } catch (e) {
        console.warn("[Kimi] Failed to parse actions from response:", e);
    }
    return [];
}
