/**
 * RFQ Generator Service — V2
 *
 * Generates professional Request for Quotation documents with:
 * - RFQ numbering (RFQ-YYYY-NNNN)
 * - Full display specs (resolution, brightness, IP rating, quantity)
 * - Structured data for rich UI preview
 * - Plain text export for email/download
 */

// ============================================================================
// TYPES
// ============================================================================

export interface RfqLineItem {
    displayName: string;
    quantity: number;
    widthFt: number;
    heightFt: number;
    areaSqFt: number;
    pixelPitch: string;
    environment: string;
    preferredProduct?: string;
    serviceType: string;
    notes?: string;
    resolution?: string;
    brightnessNits?: number;
    ipRating?: string;
    installComplexity?: string;
}

export interface RfqDocument {
    rfqNumber: string;
    subject: string;
    date: string;
    recipientCompany: string;
    recipientEmail?: string;
    projectName: string;
    clientName: string;
    location: string;
    lineItems: RfqLineItem[];
    deliveryTimeline?: string;
    includeSpares: boolean;
    specialRequirements: string[];
    bodyText: string;
    generatedAt: string;
    contactName?: string;
    contactEmail?: string;
}

export interface DisplayInput {
    displayName: string;
    widthFt: number;
    heightFt: number;
    pixelPitch: string;
    productName: string;
    locationType: string;
    serviceType: string;
    isReplacement: boolean;
    quantity?: number;
    installComplexity?: string;
}

/** Calculated data from EstimatorBridge (optional enrichment) */
export interface CalcInput {
    pixelsW?: number;
    pixelsH?: number;
    areaSqFt?: number;
    cabinetLayout?: {
        cols: number;
        rows: number;
        totalCabinets: number;
    } | null;
}

/** Product data for enrichment (from ManufacturerProduct) */
export interface ProductInput {
    maxNits?: number;
    ipRating?: string;
    refreshRate?: number;
    environment?: string;
}

interface AnswersInput {
    clientName: string;
    projectName: string;
    location: string;
    displays: DisplayInput[];
    calcs?: CalcInput[];
    products?: (ProductInput | null)[];
}

interface RfqOptions {
    deliveryTimeline?: string;
    includeSpares?: boolean;
    contactName?: string;
    contactEmail?: string;
    specialRequirements?: string[];
}

// ============================================================================
// RFQ NUMBERING
// ============================================================================

function generateRfqNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const seq = String(
        now.getMonth() * 3100 +
        now.getDate() * 100 +
        now.getHours() * 4 +
        Math.floor(now.getMinutes() / 15)
    ).padStart(4, "0");
    return `RFQ-${year}-${seq}`;
}

function formatDate(): string {
    return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

// ============================================================================
// GENERATOR
// ============================================================================

export function generateRfq(
    answers: AnswersInput,
    manufacturer: string,
    options?: RfqOptions
): RfqDocument {
    const includeSpares = options?.includeSpares !== false;
    const specialRequirements = options?.specialRequirements || [];
    const rfqNumber = generateRfqNumber();
    const date = formatDate();

    const lineItems: RfqLineItem[] = answers.displays.map((d, i) => {
        const calc = answers.calcs?.[i];
        const product = answers.products?.[i];
        const areaSqFt = calc?.areaSqFt ??
            Math.round(d.widthFt * d.heightFt * 100) / 100;
        const environment = (d.locationType === "outdoor" || product?.environment === "outdoor")
            ? "Outdoor" : "Indoor";

        let resolution: string | undefined;
        if (calc?.pixelsW && calc?.pixelsH) {
            resolution = `${calc.pixelsW.toLocaleString()} × ${calc.pixelsH.toLocaleString()}`;
        }

        return {
            displayName: d.displayName || "Unnamed Display",
            quantity: d.quantity ?? 1,
            widthFt: d.widthFt,
            heightFt: d.heightFt,
            areaSqFt,
            pixelPitch: d.pixelPitch || "TBD",
            environment,
            preferredProduct: d.productName || undefined,
            serviceType: d.serviceType || "front",
            notes: d.isReplacement ? "Replacement for existing display" : undefined,
            resolution,
            brightnessNits: product?.maxNits,
            ipRating: environment === "Outdoor" ? (product?.ipRating || "IP65 required") : product?.ipRating,
            installComplexity: d.installComplexity,
        };
    });

    // Build email body
    const lines: string[] = [];

    lines.push(rfqNumber);
    lines.push(`Date: ${date}`);
    lines.push("");
    lines.push(`Subject: RFQ: ${answers.projectName} — LED Display Systems`);
    lines.push("");
    lines.push(`Dear ${manufacturer} Sales Team,`);
    lines.push("");
    lines.push(
        `ANC Sports Enterprises is requesting a quotation for the following LED display system${lineItems.length > 1 ? "s" : ""} for the ${answers.projectName} project located in ${answers.location}.`
    );
    lines.push("");
    lines.push(`PROJECT:  ${answers.projectName}`);
    lines.push(`CLIENT:   ${answers.clientName}`);
    lines.push(`LOCATION: ${answers.location}`);
    lines.push(`DISPLAYS: ${lineItems.length}`);

    lines.push("");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("DISPLAY REQUIREMENTS");
    lines.push("═══════════════════════════════════════════════════");

    for (const item of lineItems) {
        lines.push("");
        lines.push(`▸ ${item.displayName}${item.quantity > 1 ? ` (Qty: ${item.quantity})` : ""}`);
        lines.push(`  Dimensions:     ${item.widthFt}' W × ${item.heightFt}' H (${item.areaSqFt} sq ft)`);
        lines.push(`  Pixel Pitch:    ${item.pixelPitch}`);
        if (item.resolution) {
            lines.push(`  Resolution:     ${item.resolution} px`);
        }
        lines.push(`  Environment:    ${item.environment}`);
        if (item.brightnessNits) {
            lines.push(`  Brightness:     ${item.brightnessNits.toLocaleString()} nits minimum`);
        }
        if (item.ipRating) {
            lines.push(`  IP Rating:      ${item.ipRating}`);
        }
        lines.push(`  Service Access: ${item.serviceType}`);
        if (item.preferredProduct) {
            lines.push(`  Preferred:      ${item.preferredProduct}`);
        }
        if (item.notes) {
            lines.push(`  Note:           ${item.notes}`);
        }
    }

    if (includeSpares) {
        lines.push("");
        lines.push("───────────────────────────────────────────────────");
        lines.push("SPARE PARTS");
        lines.push("Please include pricing for 2% spare modules and");
        lines.push("2% spare power supplies per display.");
    }

    if (specialRequirements.length > 0) {
        lines.push("");
        lines.push("───────────────────────────────────────────────────");
        lines.push("SPECIAL REQUIREMENTS");
        for (const req of specialRequirements) {
            lines.push(`  • ${req}`);
        }
    }

    lines.push("");
    lines.push("───────────────────────────────────────────────────");
    lines.push("REQUESTED DELIVERABLES");
    lines.push("  • Unit pricing per cabinet/module");
    lines.push("  • Total system pricing per display");
    lines.push("  • Cabinet dimensions and weight");
    lines.push("  • Power consumption (max and typical)");
    lines.push("  • Maximum brightness (nits) and refresh rate");
    lines.push("  • IP rating and operating temperature range");
    lines.push("  • Lead time from PO to delivery");
    lines.push("  • Warranty terms and duration");
    if (options?.deliveryTimeline) {
        lines.push(`  • Target delivery: ${options.deliveryTimeline}`);
    }

    lines.push("");
    lines.push("───────────────────────────────────────────────────");
    lines.push("RESPONSE");
    lines.push("");
    lines.push("Please direct your quotation to:");
    lines.push("ANC Sports Enterprises, LLC");
    lines.push("2 Manhattanville Road, Suite 402");
    lines.push("Purchase, NY 10577");
    if (options?.contactName) {
        lines.push(`Attn: ${options.contactName}`);
    }
    if (options?.contactEmail) {
        lines.push(`Email: ${options.contactEmail}`);
    }

    lines.push("");
    lines.push("Thank you for your prompt attention to this request.");
    lines.push("");
    lines.push("Best regards,");
    lines.push("ANC Sports Enterprises");

    const bodyText = lines.join("\n");

    return {
        rfqNumber,
        subject: `RFQ: ${answers.projectName} — LED Display Systems`,
        date,
        recipientCompany: manufacturer,
        recipientEmail: undefined,
        projectName: answers.projectName,
        clientName: answers.clientName,
        location: answers.location,
        lineItems,
        deliveryTimeline: options?.deliveryTimeline,
        includeSpares,
        specialRequirements,
        bodyText,
        generatedAt: new Date().toISOString(),
        contactName: options?.contactName,
        contactEmail: options?.contactEmail,
    };
}
