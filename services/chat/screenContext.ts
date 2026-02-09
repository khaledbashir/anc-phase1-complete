/**
 * Screen Context — Captures the current state of the proposal UI
 * so the copilot can see what the user sees.
 *
 * This runs CLIENT-SIDE only. It reads from react-hook-form state
 * via the FormFillContext (setValue/getValues). No API calls.
 */

import type { FormFillContext } from "./formFillBridge";
import type { PricingDocument, PricingTable } from "@/types/pricing";

// ============================================================================
// TYPES
// ============================================================================

export interface ScreenSection {
    index: number;
    name: string;
    lineItemCount: number;
    subtotal: number;
    hasAlternates: boolean;
}

export interface ScreenContext {
    // Where the user is
    currentStep: number; // 0=Ingestion, 1=Intelligence, 2=Math, 3=Export
    currentStepName: string;

    // Mode detection
    isMirrorMode: boolean;
    documentMode: "BUDGET" | "PROPOSAL" | "LOI";
    calculationMode: "MIRROR" | "INTELLIGENCE";

    // Pricing tables from Excel (Mirror Mode)
    sections: ScreenSection[];
    grandTotal: number;
    currency: string;

    // Text fields (truncated to 200 chars)
    introText: string;
    paymentTerms: string;
    signatureText: string;
    additionalNotes: string;
    customProposalNotes: string;

    // Client info
    clientName: string;
    clientAddress: string;

    // Screen specs
    screenCount: number;

    // What's editable right now
    editableFields: string[];
    readOnlyReason: string;
}

// ============================================================================
// STEP NAME MAPPING
// ============================================================================

const STEP_NAMES: Record<number, string> = {
    0: "Ingestion (Step 1 of 4)",
    1: "Intelligence (Step 2 of 4)",
    2: "Math (Step 3 of 4)",
    3: "Export (Step 4 of 4)",
};

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Pull the current screen state from react-hook-form.
 * Call this before every copilot message to give the AI full visibility.
 */
export function getScreenContext(
    ctx: FormFillContext,
    currentStep: number
): ScreenContext {
    const g = ctx.getValues;

    // Mode detection
    const mirrorMode = g("details.mirrorMode") === true;
    const documentMode = (g("details.documentMode") || "BUDGET") as "BUDGET" | "PROPOSAL" | "LOI";
    const calculationMode = (g("details.calculationMode") || "INTELLIGENCE") as "MIRROR" | "INTELLIGENCE";

    // Pricing sections from PricingDocument (Mirror Mode)
    const pricingDoc = g("details.pricingDocument") as PricingDocument | undefined;
    const tables: PricingTable[] = pricingDoc?.tables || [];
    const sections: ScreenSection[] = tables.map((t, i) => ({
        index: i,
        name: t.name,
        lineItemCount: t.items.length,
        subtotal: t.subtotal,
        hasAlternates: (t.alternates?.length || 0) > 0,
    }));
    const grandTotal = pricingDoc?.documentTotal || 0;
    const currency = pricingDoc?.currency || g("details.currency") || "USD";

    // Text fields (truncated)
    const truncate = (val: any, max = 200): string => {
        const s = String(val || "");
        return s.length > max ? s.slice(0, max) + "..." : s;
    };

    const introText = truncate(g("details.introductionText"));
    const paymentTerms = truncate(g("details.paymentTerms"));
    const signatureText = truncate(g("details.signatureBlockText"));
    const additionalNotes = truncate(g("details.additionalNotes"));
    const customProposalNotes = truncate(g("details.customProposalNotes"));

    // Client info
    const clientName = g("receiver.name") || "";
    const clientAddress = [g("receiver.address"), g("receiver.city"), g("receiver.country")]
        .filter(Boolean)
        .join(", ");

    // Screen specs (Intelligence Mode screens)
    const screens = g("details.screens") || [];
    const screenCount = Array.isArray(screens) ? screens.length : 0;

    // Editable fields depend on mode + step
    const editableFields: string[] = [];
    const readOnlyFields: string[] = [];

    // Always editable
    editableFields.push("documentMode", "introductionText", "paymentTerms", "signatureBlockText", "additionalNotes", "customProposalNotes", "loiHeaderText");

    if (mirrorMode) {
        readOnlyFields.push("prices", "subtotals", "margins", "tax", "bond", "grandTotal", "lineItems");
        // Section header typo fixes ARE allowed
        editableFields.push("tableHeaderOverrides");
    } else {
        // Intelligence Mode — everything is editable
        editableFields.push("prices", "margins", "lineItems", "screens", "taxRateOverride", "bondRateOverride");
    }

    const readOnlyReason = mirrorMode
        ? "Mirror Mode — prices come from Excel and are read-only. To change pricing, update the Excel and re-upload."
        : "";

    return {
        currentStep,
        currentStepName: STEP_NAMES[currentStep] || `Step ${currentStep}`,
        isMirrorMode: mirrorMode,
        documentMode,
        calculationMode,
        sections,
        grandTotal,
        currency,
        introText,
        paymentTerms,
        signatureText,
        additionalNotes,
        customProposalNotes,
        clientName,
        clientAddress,
        screenCount,
        editableFields,
        readOnlyReason,
    };
}

// ============================================================================
// FORMAT FOR SYSTEM PROMPT
// ============================================================================

/**
 * Format the screen context as a readable block for the AI system prompt.
 */
export function formatScreenContext(sc: ScreenContext): string {
    const lines: string[] = [];

    lines.push("== CURRENT SCREEN STATE ==");
    lines.push(`Step: ${sc.currentStepName}`);
    lines.push(`Mode: ${sc.isMirrorMode ? "Mirror Mode (Excel uploaded — prices are READ-ONLY)" : "Intelligence Mode (full editing)"}`);
    lines.push(`Document Type: ${sc.documentMode}`);
    lines.push(`Client: ${sc.clientName || "(not set)"}`);
    lines.push(`Currency: ${sc.currency}`);

    if (sc.sections.length > 0) {
        lines.push("");
        lines.push(`Pricing Sections (${sc.sections.length} total):`);
        for (const s of sc.sections) {
            const price = s.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const alt = s.hasAlternates ? " — has alternates" : "";
            lines.push(`  ${s.index + 1}. ${s.name} — ${s.lineItemCount} items — $${price}${alt}`);
        }
        const gt = sc.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        lines.push(`Grand Total: $${gt}`);
    } else if (sc.screenCount > 0) {
        lines.push(`\nScreens: ${sc.screenCount} display(s) configured`);
    } else {
        lines.push("\nNo pricing sections or screens configured yet.");
    }

    if (sc.introText) lines.push(`\nCurrent Intro Text: "${sc.introText}"`);
    if (sc.paymentTerms) lines.push(`Payment Terms: "${sc.paymentTerms}"`);
    if (sc.additionalNotes) lines.push(`Notes: "${sc.additionalNotes}"`);
    if (sc.customProposalNotes) lines.push(`Custom Notes: "${sc.customProposalNotes}"`);

    lines.push(`\nEditable right now: [${sc.editableFields.join(", ")}]`);
    if (sc.readOnlyReason) {
        lines.push(`NOT editable: ${sc.readOnlyReason}`);
    }

    return lines.join("\n");
}
