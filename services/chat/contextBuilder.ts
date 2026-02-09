/**
 * Copilot Context Builder — P67
 *
 * Builds a context string from the current project state to send with every AI request.
 * This gives the AI copilot awareness of what the user is working on.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProjectState {
    // From form values
    proposalName?: string;
    clientName?: string;
    documentMode?: string;
    isMirrorMode?: boolean;
    currentStep?: number; // 1-4
    screenCount?: number;
    screens?: Array<{
        name: string;
        widthFt?: number;
        heightFt?: number;
        pitchMm?: number;
        desiredMargin?: number;
        isManualLineItem?: boolean;
    }>;
    globalMargin?: number;
    bondRate?: number;
    taxRate?: number;
    quoteItemCount?: number;
    totalProjectValue?: number;
    // Audit summary
    auditAvailable?: boolean;
    totalCost?: number;
    sellPrice?: number;
    effectiveMargin?: number;
}

// ============================================================================
// BUILDER
// ============================================================================

/**
 * Build a concise context string for the AI copilot.
 */
export function buildCopilotContext(state: ProjectState): string {
    const parts: string[] = [];

    parts.push("You are ANC Copilot, an AI assistant for the ANC Proposal Engine — a tool for creating LED display proposals.");
    parts.push("You help users with pricing, product selection, and proposal formatting.");
    parts.push("Use the Natalia Divisor Model: Sell Price = Cost / (1 - Margin%).");
    parts.push("");

    // Current project
    parts.push("## Current Project State");
    if (state.proposalName) parts.push(`- Project: ${state.proposalName}`);
    if (state.clientName) parts.push(`- Client: ${state.clientName}`);
    if (state.documentMode) parts.push(`- Document Mode: ${state.documentMode}`);
    parts.push(`- Mode: ${state.isMirrorMode ? "Mirror Mode (Excel pass-through)" : "Intelligence Mode (built-in pricing)"}`);
    if (state.currentStep) parts.push(`- Current Wizard Step: ${state.currentStep}/4`);

    // Screens
    if (state.screenCount !== undefined) {
        parts.push(`- Screens: ${state.screenCount}`);
    }
    if (state.screens && state.screens.length > 0) {
        parts.push("- Screen Details:");
        state.screens.slice(0, 5).forEach((s, i) => {
            const dims = s.widthFt && s.heightFt ? `${s.widthFt}'×${s.heightFt}'` : "no dims";
            const pitch = s.pitchMm ? `${s.pitchMm}mm` : "no pitch";
            const margin = s.desiredMargin ? `${(s.desiredMargin * 100).toFixed(0)}%` : "default";
            parts.push(`  ${i + 1}. ${s.name || "Unnamed"} — ${dims}, ${pitch}, margin ${margin}${s.isManualLineItem ? " (manual)" : ""}`);
        });
        if (state.screens.length > 5) parts.push(`  ... and ${state.screens.length - 5} more`);
    }

    // Pricing
    if (state.globalMargin !== undefined) parts.push(`- Global Margin: ${(state.globalMargin * 100).toFixed(1)}%`);
    if (state.bondRate !== undefined) parts.push(`- Bond Rate: ${state.bondRate}%`);
    if (state.taxRate !== undefined) parts.push(`- Tax Rate: ${(state.taxRate * 100).toFixed(1)}%`);
    if (state.quoteItemCount !== undefined) parts.push(`- Quote Items: ${state.quoteItemCount}`);

    // Audit
    if (state.auditAvailable) {
        parts.push("- Audit Summary:");
        if (state.totalCost !== undefined) parts.push(`  Total Cost: $${state.totalCost.toLocaleString()}`);
        if (state.sellPrice !== undefined) parts.push(`  Sell Price: $${state.sellPrice.toLocaleString()}`);
        if (state.totalProjectValue !== undefined) parts.push(`  Final Client Total: $${state.totalProjectValue.toLocaleString()}`);
        if (state.effectiveMargin !== undefined) parts.push(`  Effective Margin: ${(state.effectiveMargin * 100).toFixed(1)}%`);
    }

    parts.push("");
    parts.push("## Instructions");
    parts.push("- Be concise and helpful. Use bullet points.");
    parts.push("- If the user asks to change a setting (margin, bond, tax), confirm the change.");
    parts.push("- For product recommendations, consider environment (indoor/outdoor), pixel pitch, and viewing distance.");
    parts.push("- Never share internal cost data with clients — it's confidential.");
    parts.push("- Reference the Natalia Divisor Model when explaining pricing math.");

    return parts.join("\n");
}

/**
 * Extract project state from form values.
 */
export function extractProjectState(getValues: (name?: string) => any, currentStep?: number): ProjectState {
    const details = getValues("details") || {};
    const receiver = getValues("receiver") || {};
    const screens = details.screens || [];
    const audit = details.internalAudit;

    return {
        proposalName: details.proposalName,
        clientName: receiver.name,
        documentMode: details.documentMode,
        isMirrorMode: details.mirrorMode === true || (details.pricingDocument?.tables?.length ?? 0) > 0,
        currentStep,
        screenCount: screens.length,
        screens: screens.map((s: any) => ({
            name: s.name || s.externalName || "",
            widthFt: s.widthFt,
            heightFt: s.heightFt,
            pitchMm: s.pitchMm,
            desiredMargin: s.desiredMargin,
            isManualLineItem: s.isManualLineItem,
        })),
        globalMargin: details.globalMargin,
        bondRate: details.globalBondRate || details.bondRate,
        taxRate: details.taxRateOverride,
        quoteItemCount: (details.quoteItems || []).length,
        totalProjectValue: audit?.totals?.finalClientTotal,
        auditAvailable: !!audit?.totals,
        totalCost: audit?.totals?.totalCost,
        sellPrice: audit?.totals?.sellPrice,
        effectiveMargin: audit?.totals?.sellPrice > 0
            ? 1 - (audit.totals.totalCost / audit.totals.sellPrice)
            : undefined,
    };
}
