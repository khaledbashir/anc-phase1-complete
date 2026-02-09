/**
 * Copilot Action Executor — P66
 *
 * Executes parsed intents by modifying app state via form setValue calls.
 * Returns a human-readable response describing what was done.
 */

import { type ParsedIntent } from "./intentParser";

// ============================================================================
// TYPES
// ============================================================================

export interface ExecutionContext {
    setValue: (name: string, value: any, options?: any) => void;
    getValues: (name?: string) => any;
    recalculateAudit?: () => void;
}

export interface ExecutionResult {
    success: boolean;
    message: string;
    actionTaken: string;
}

// ============================================================================
// EXECUTOR
// ============================================================================

/**
 * Execute a parsed intent against the form state.
 */
export function executeIntent(intent: ParsedIntent, ctx: ExecutionContext): ExecutionResult {
    switch (intent.type) {
        case "set_margin":
            return executeSetMargin(intent, ctx);
        case "set_bond_rate":
            return executeSetBondRate(intent, ctx);
        case "set_tax_rate":
            return executeSetTaxRate(intent, ctx);
        case "add_screen":
            return executeAddScreen(intent, ctx);
        case "add_quote_item":
            return executeAddQuoteItem(intent, ctx);
        case "export_pdf":
            return { success: false, message: "To export the PDF, click the Export button in Step 4.", actionTaken: "none" };
        case "export_csv":
            return { success: false, message: "To export the audit CSV, go to Step 3 and click 'Export Audit CSV' in the audit table.", actionTaken: "none" };
        default:
            return { success: false, message: "", actionTaken: "none" };
    }
}

function executeSetMargin(intent: ParsedIntent, ctx: ExecutionContext): ExecutionResult {
    const margin = intent.params.margin;
    if (margin === undefined || margin < 0 || margin >= 1) {
        return { success: false, message: `Invalid margin: ${(margin * 100).toFixed(1)}%. Must be between 0% and 99%.`, actionTaken: "none" };
    }

    const screens = ctx.getValues("details.screens") || [];
    const updatedScreens = screens.map((s: any) => ({ ...s, desiredMargin: margin }));
    ctx.setValue("details.screens", updatedScreens, { shouldDirty: true });
    ctx.setValue("details.globalMargin", margin, { shouldDirty: true });
    ctx.recalculateAudit?.();

    return {
        success: true,
        message: `Global margin set to **${(margin * 100).toFixed(1)}%** across all ${screens.length} screen(s). Audit recalculated.`,
        actionTaken: "set_margin",
    };
}

function executeSetBondRate(intent: ParsedIntent, ctx: ExecutionContext): ExecutionResult {
    const rate = intent.params.bondRate;
    if (rate === undefined || rate < 0 || rate > 10) {
        return { success: false, message: `Invalid bond rate: ${rate}%. Must be between 0% and 10%.`, actionTaken: "none" };
    }

    ctx.setValue("details.bondRate", rate, { shouldDirty: true });
    ctx.setValue("details.globalBondRate", rate, { shouldDirty: true });
    ctx.setValue("details.bondRateOverride", rate, { shouldDirty: true });
    ctx.recalculateAudit?.();

    return {
        success: true,
        message: `Bond rate set to **${rate}%**. Audit recalculated.`,
        actionTaken: "set_bond_rate",
    };
}

function executeSetTaxRate(intent: ParsedIntent, ctx: ExecutionContext): ExecutionResult {
    const rate = intent.params.taxRate;
    if (rate === undefined || rate < 0 || rate > 0.25) {
        return { success: false, message: `Invalid tax rate. Must be between 0% and 25%.`, actionTaken: "none" };
    }

    ctx.setValue("details.taxRateOverride", rate, { shouldDirty: true });
    ctx.recalculateAudit?.();

    return {
        success: true,
        message: `Sales tax rate set to **${(rate * 100).toFixed(1)}%**. Audit recalculated.`,
        actionTaken: "set_tax_rate",
    };
}

function executeAddScreen(_intent: ParsedIntent, ctx: ExecutionContext): ExecutionResult {
    const screens = ctx.getValues("details.screens") || [];
    const newScreen = {
        name: `Screen ${screens.length + 1}`,
        productType: "Manual Item",
        quantity: 1,
        desiredMargin: ctx.getValues("details.globalMargin") || 0.25,
        isManualLineItem: true,
        manualCost: 0,
        widthFt: 0,
        heightFt: 0,
        pitchMm: 0,
        isReplacement: false,
        useExistingStructure: false,
        includeSpareParts: false,
    };
    ctx.setValue("details.screens", [...screens, newScreen], { shouldDirty: true });

    return {
        success: true,
        message: `Added **Screen ${screens.length + 1}**. Go to Step 2 to configure its dimensions and specs.`,
        actionTaken: "add_screen",
    };
}

function executeAddQuoteItem(_intent: ParsedIntent, ctx: ExecutionContext): ExecutionResult {
    const items = ctx.getValues("details.quoteItems") || [];
    const newItem = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        locationName: "NEW ITEM",
        description: "",
        price: 0,
    };
    ctx.setValue("details.quoteItems", [...items, newItem], { shouldDirty: true });

    return {
        success: true,
        message: `Added a new quote item. Go to Step 3 to fill in the details.`,
        actionTaken: "add_quote_item",
    };
}
