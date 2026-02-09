/**
 * RFP to Proposal Auto-Fill — P74
 *
 * Auto-populates proposal form fields from extracted RFP data.
 * Maps extracted displays, client info, and project metadata to form state.
 */

import type { ExtractedDisplay } from "./displayScheduleExtractor";

// ============================================================================
// TYPES
// ============================================================================

export interface RFPExtractedData {
    clientName?: string;
    clientAddress?: string;
    venue?: string;
    projectTitle?: string;
    displays: ExtractedDisplay[];
    specialRequirements: string[];
    isUnionLabor?: boolean;
    isOutdoor?: boolean;
    bondRequired?: boolean;
    extractionAccuracy: "High" | "Standard" | "Low";
}

export interface AutoFillResult {
    fieldsPopulated: string[];
    fieldsSkipped: string[];
    screensCreated: number;
    warnings: string[];
}

// ============================================================================
// AUTO-FILL
// ============================================================================

/**
 * Auto-fill proposal form from extracted RFP data.
 * Returns a partial form values object to merge into the form.
 */
export function buildAutoFillValues(extracted: RFPExtractedData): {
    values: Record<string, any>;
    result: AutoFillResult;
} {
    const fieldsPopulated: string[] = [];
    const fieldsSkipped: string[] = [];
    const warnings: string[] = [];
    const values: Record<string, any> = {};

    // Client info
    if (extracted.clientName) {
        values["receiver.name"] = extracted.clientName;
        fieldsPopulated.push("receiver.name");
    } else {
        fieldsSkipped.push("receiver.name");
    }

    if (extracted.clientAddress) {
        values["receiver.address"] = extracted.clientAddress;
        fieldsPopulated.push("receiver.address");
    }

    // Project info
    if (extracted.projectTitle) {
        values["details.proposalName"] = extracted.projectTitle;
        fieldsPopulated.push("details.proposalName");
    }

    if (extracted.venue) {
        values["details.venue"] = extracted.venue;
        fieldsPopulated.push("details.venue");
    }

    // Screens from extracted displays
    const screens = extracted.displays.map((d, idx) => ({
        name: d.name || `Screen ${idx + 1}`,
        externalName: d.name,
        productType: "Manual Item",
        quantity: d.quantity || 1,
        widthFt: d.widthFt || 0,
        heightFt: d.heightFt || 0,
        pitchMm: d.pitchMm || 0,
        desiredMargin: 0.25, // Default 25%
        isManualLineItem: true,
        manualCost: 0,
        isReplacement: false,
        useExistingStructure: false,
        includeSpareParts: false,
        environment: d.environment || "Indoor",
        brightness: d.brightness,
        notes: d.notes,
    }));

    if (screens.length > 0) {
        values["details.screens"] = screens;
        fieldsPopulated.push(`details.screens (${screens.length} displays)`);
    } else {
        warnings.push("No displays extracted from RFP — manual entry required");
    }

    // Context flags
    if (extracted.isUnionLabor) {
        warnings.push("Union labor detected — IBEW surcharge may apply");
    }
    if (extracted.bondRequired) {
        values["details.bondRate"] = 1.5;
        fieldsPopulated.push("details.bondRate");
    }

    // Accuracy warning
    if (extracted.extractionAccuracy === "Low") {
        warnings.push("Low extraction accuracy — please verify all fields manually");
    }

    return {
        values,
        result: {
            fieldsPopulated,
            fieldsSkipped,
            screensCreated: screens.length,
            warnings,
        },
    };
}

/**
 * Apply auto-fill values to a form using setValue.
 */
export function applyAutoFill(
    values: Record<string, any>,
    setValue: (name: string, value: any, options?: any) => void
): void {
    for (const [key, value] of Object.entries(values)) {
        setValue(key, value, { shouldDirty: true, shouldValidate: true });
    }
}
