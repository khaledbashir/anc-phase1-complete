/**
 * Form Fill Bridge — Client-side functions that write copilot-parsed data
 * into the react-hook-form state via setValue.
 *
 * This runs in the browser. It receives a setValue function from useFormContext
 * and writes structured data into the proposal form fields.
 * Auto-save picks up changes automatically.
 */

import type { UseFormSetValue, UseFormGetValues } from "react-hook-form";
import type { StageAction } from "./proposalConversationFlow";

// ============================================================================
// TYPES
// ============================================================================

export interface FormFillContext {
    setValue: UseFormSetValue<any>;
    getValues: UseFormGetValues<any>;
}

// ============================================================================
// ACTION EXECUTOR
// ============================================================================

/**
 * Execute a list of stage actions against the form.
 * Returns a summary of what was changed.
 */
export function executeActions(
    ctx: FormFillContext,
    actions: StageAction[]
): string[] {
    const log: string[] = [];

    for (const action of actions) {
        switch (action.type) {
            case "fill_client_name":
                fillClientName(ctx, action.data.name);
                log.push(`Set client name: ${action.data.name}`);
                break;

            case "add_display":
                addDisplay(ctx, action.data);
                log.push(`Added display: ${action.data.widthM}m × ${action.data.heightM}m @ ${action.data.pitchMm}mm`);
                break;

            case "set_display_price":
                setDisplayPrice(ctx, action.data.index, action.data.price);
                log.push(`Set display ${action.data.index + 1} price: $${action.data.price.toLocaleString()}`);
                break;

            case "add_service":
                addServiceItem(ctx, action.data);
                log.push(`Added service: ${action.data.description} — $${action.data.price.toLocaleString()}`);
                break;

            case "set_tax":
                setTaxRate(ctx, action.data.rate);
                log.push(`Set tax rate: ${(action.data.rate * 100).toFixed(1)}%`);
                break;

            case "set_bond":
                setBondRate(ctx, action.data.rate);
                log.push(`Set bond rate: ${(action.data.rate * 100).toFixed(1)}%`);
                break;

            case "generate_pdf":
                setDocumentType(ctx, action.data.documentType);
                log.push(`Set document type: ${action.data.documentType}`);
                break;

            default:
                log.push(`Unknown action: ${(action as any).type}`);
        }
    }

    return log;
}

// ============================================================================
// INDIVIDUAL FILL FUNCTIONS
// ============================================================================

function fillClientName(ctx: FormFillContext, name: string) {
    ctx.setValue("receiver.name", name, { shouldDirty: true });
    // Also set proposalName if empty
    const currentName = ctx.getValues("details.proposalName");
    if (!currentName) {
        ctx.setValue("details.proposalName", name, { shouldDirty: true });
    }
}

function addDisplay(
    ctx: FormFillContext,
    data: { description: string; widthM: number; heightM: number; pitchMm: number; quantity: number }
) {
    const screens = ctx.getValues("details.screens") || [];

    // Convert meters to feet for the form (1m = 3.28084ft)
    const widthFt = data.widthM * 3.28084;
    const heightFt = data.heightM * 3.28084;

    // Add one screen entry per quantity
    for (let i = 0; i < data.quantity; i++) {
        const newScreen = {
            id: `copilot-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
            name: data.description || `Display ${screens.length + 1}`,
            externalName: "",
            group: "",
            pitchMm: data.pitchMm,
            widthFt: parseFloat(widthFt.toFixed(2)),
            heightFt: parseFloat(heightFt.toFixed(2)),
            quantity: 1,
            lineItems: [],
        };
        screens.push(newScreen);
    }

    ctx.setValue("details.screens", screens, { shouldDirty: true, shouldValidate: true });
}

function setDisplayPrice(ctx: FormFillContext, displayIndex: number, price: number) {
    const screens = ctx.getValues("details.screens") || [];
    if (displayIndex >= screens.length) return;

    // Set the LED panel cost as a line item
    const screen = screens[displayIndex];
    const existingItems = screen.lineItems || [];

    // Check if there's already an LED panel line item
    const ledIdx = existingItems.findIndex(
        (li: any) => li.category === "LED Panels" || li.category === "LED Display"
    );

    const lineItem = {
        category: "LED Panels",
        cost: price * 0.6,  // Estimate cost at 60% of sell
        margin: 0.4,
        price: price,
    };

    if (ledIdx >= 0) {
        existingItems[ledIdx] = lineItem;
    } else {
        existingItems.push(lineItem);
    }

    screens[displayIndex] = { ...screen, lineItems: [...existingItems] };
    ctx.setValue("details.screens", [...screens], { shouldDirty: true, shouldValidate: true });
}

function addServiceItem(
    ctx: FormFillContext,
    data: { description: string; price: number }
) {
    // Services go into quoteItems (the Sales Quotation Items in Step 3)
    const quoteItems = ctx.getValues("details.quoteItems") || [];

    quoteItems.push({
        id: `copilot-svc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
        location: data.description,
        price: data.price,
        description: data.description,
    });

    ctx.setValue("details.quoteItems", [...quoteItems], { shouldDirty: true });
}

function setTaxRate(ctx: FormFillContext, rate: number) {
    ctx.setValue("details.taxRateOverride", rate, { shouldDirty: true });
    // Also set in taxDetails for PDF generation
    ctx.setValue("details.taxDetails", {
        amount: rate * 100,
        amountType: "percentage",
        taxID: "",
    }, { shouldDirty: true });
}

function setBondRate(ctx: FormFillContext, rate: number) {
    ctx.setValue("details.bondRateOverride", rate, { shouldDirty: true });
}

function setDocumentType(ctx: FormFillContext, docType: "BUDGET" | "PROPOSAL" | "LOI") {
    ctx.setValue("details.documentMode", docType, { shouldDirty: true });

    if (docType === "BUDGET") {
        ctx.setValue("details.documentType", "First Round", { shouldDirty: true });
        ctx.setValue("details.pricingType", "Budget", { shouldDirty: true });
    } else if (docType === "PROPOSAL") {
        ctx.setValue("details.documentType", "First Round", { shouldDirty: true });
        ctx.setValue("details.pricingType", "Hard Quoted", { shouldDirty: true });
    } else if (docType === "LOI") {
        ctx.setValue("details.documentType", "LOI", { shouldDirty: true });
        ctx.setValue("details.pricingType", "Hard Quoted", { shouldDirty: true });
    }
}

// ============================================================================
// SCREEN-AWARE ACTION EXECUTOR
// ============================================================================

export interface ScreenAction {
    action: string;
    value?: any;
    sectionIndex?: number;
    step?: number;
}

/**
 * Execute screen-aware actions returned by the LLM.
 * These modify form state directly based on what the user asked the copilot to do.
 * Returns a log of what was changed + any special flags (e.g. downloadPdf, navigateStep).
 */
export function executeScreenActions(
    ctx: FormFillContext,
    screenActions: ScreenAction[]
): { log: string[]; downloadPdf?: boolean; navigateStep?: number } {
    const log: string[] = [];
    let downloadPdf = false;
    let navigateStep: number | undefined;

    for (const sa of screenActions) {
        switch (sa.action) {
            case "set_document_mode": {
                const mode = String(sa.value).toUpperCase() as "BUDGET" | "PROPOSAL" | "LOI";
                if (["BUDGET", "PROPOSAL", "LOI"].includes(mode)) {
                    setDocumentType(ctx, mode);
                    log.push(`Switched document type to ${mode}`);
                }
                break;
            }

            case "set_intro_text": {
                if (typeof sa.value === "string") {
                    ctx.setValue("details.introductionText", sa.value, { shouldDirty: true });
                    log.push("Updated intro text");
                }
                break;
            }

            case "append_intro_text": {
                if (typeof sa.value === "string") {
                    const current = ctx.getValues("details.introductionText") || "";
                    const separator = current ? "\n\n" : "";
                    ctx.setValue("details.introductionText", current + separator + sa.value, { shouldDirty: true });
                    log.push("Appended to intro text");
                }
                break;
            }

            case "set_payment_terms": {
                if (typeof sa.value === "string") {
                    ctx.setValue("details.paymentTerms", sa.value, { shouldDirty: true });
                    log.push("Updated payment terms");
                }
                break;
            }

            case "set_notes": {
                if (typeof sa.value === "string") {
                    ctx.setValue("details.additionalNotes", sa.value, { shouldDirty: true });
                    log.push("Updated notes");
                }
                break;
            }

            case "set_signature_text": {
                if (typeof sa.value === "string") {
                    ctx.setValue("details.signatureBlockText", sa.value, { shouldDirty: true });
                    log.push("Updated signature block text");
                }
                break;
            }

            case "fix_section_header": {
                if (typeof sa.sectionIndex === "number" && typeof sa.value === "string") {
                    const overrides = ctx.getValues("details.tableHeaderOverrides") || {};
                    const key = String(sa.sectionIndex);
                    overrides[key] = sa.value;
                    ctx.setValue("details.tableHeaderOverrides", { ...overrides }, { shouldDirty: true });
                    log.push(`Fixed section ${sa.sectionIndex + 1} header → "${sa.value}"`);
                }
                break;
            }

            case "download_pdf": {
                downloadPdf = true;
                log.push("Triggering PDF download");
                break;
            }

            case "navigate_step": {
                if (typeof sa.step === "number" && sa.step >= 0 && sa.step <= 3) {
                    navigateStep = sa.step;
                    log.push(`Navigating to step ${sa.step + 1}`);
                }
                break;
            }

            default:
                log.push(`Unknown screen action: ${sa.action}`);
        }
    }

    return { log, downloadPdf, navigateStep };
}
