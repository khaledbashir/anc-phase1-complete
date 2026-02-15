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
}

export interface RfqDocument {
    subject: string;
    recipientCompany: string;
    recipientEmail?: string;
    projectName: string;
    clientName: string;
    location: string;
    lineItems: RfqLineItem[];
    deliveryTimeline?: string;
    specialRequirements: string[];
    bodyText: string;
    generatedAt: string;
}

interface DisplayInput {
    displayName: string;
    widthFt: number;
    heightFt: number;
    pixelPitch: string;
    productName: string;
    locationType: string;
    serviceType: string;
    isReplacement: boolean;
}

interface AnswersInput {
    clientName: string;
    projectName: string;
    location: string;
    displays: DisplayInput[];
}

interface RfqOptions {
    deliveryTimeline?: string;
    includeSpares?: boolean;
    contactName?: string;
    contactEmail?: string;
    specialRequirements?: string[];
}

export function generateRfq(
    answers: AnswersInput,
    manufacturer: string,
    options?: RfqOptions
): RfqDocument {
    const includeSpares = options?.includeSpares !== false;
    const specialRequirements = options?.specialRequirements || [];

    // Build line items from displays
    const lineItems: RfqLineItem[] = answers.displays.map((d) => {
        const areaSqFt =
            Math.round(d.widthFt * d.heightFt * 100) / 100;
        const environment = d.locationType === "outdoor" ? "Outdoor" : "Indoor";

        return {
            displayName: d.displayName || "Unnamed Display",
            quantity: 1,
            widthFt: d.widthFt,
            heightFt: d.heightFt,
            areaSqFt,
            pixelPitch: d.pixelPitch || "TBD",
            environment,
            preferredProduct: d.productName || undefined,
            serviceType: d.serviceType || "front",
            notes: d.isReplacement ? "Replacement for existing display" : undefined,
        };
    });

    // Build email body
    const lines: string[] = [];

    lines.push(`Subject: RFQ: ${answers.projectName} - LED Display Systems`);
    lines.push("");
    lines.push(`Dear ${manufacturer} Sales Team,`);
    lines.push("");
    lines.push(
        `ANC Sports Enterprises is requesting a quotation for the following LED display systems for the ${answers.projectName} project located in ${answers.location}.`
    );
    lines.push("");
    lines.push(`PROJECT: ${answers.projectName}`);
    lines.push(`CLIENT: ${answers.clientName}`);
    lines.push(`LOCATION: ${answers.location}`);
    lines.push("");
    lines.push("DISPLAY REQUIREMENTS:");
    lines.push("━━━━━━━━━━━━━━━━━━━━");

    for (const item of lineItems) {
        lines.push("");
        lines.push(`Display: ${item.displayName}`);
        lines.push(
            `  Dimensions: ${item.widthFt}' W × ${item.heightFt}' H (${item.areaSqFt} sq ft)`
        );
        lines.push(`  Pixel Pitch: ${item.pixelPitch}`);
        lines.push(`  Environment: ${item.environment}`);
        lines.push(`  Service Access: ${item.serviceType}`);
        if (item.preferredProduct) {
            lines.push(`  Preferred Model: ${item.preferredProduct}`);
        }
        if (item.notes) {
            lines.push(`  Note: ${item.notes}`);
        }
    }

    if (includeSpares) {
        lines.push("");
        lines.push(
            "SPARE PARTS: Please include pricing for 2% spare modules."
        );
    }

    if (specialRequirements.length > 0) {
        lines.push("");
        lines.push("SPECIAL REQUIREMENTS:");
        for (const req of specialRequirements) {
            lines.push(`• ${req}`);
        }
    }

    lines.push("");
    lines.push("REQUESTED DELIVERABLES:");
    lines.push("• Unit pricing per cabinet/module");
    lines.push("• Total system pricing");
    lines.push("• Cabinet dimensions and weight");
    lines.push("• Power consumption (max and typical)");
    lines.push("• Lead time from PO to delivery");
    lines.push("• Warranty terms");
    if (options?.deliveryTimeline) {
        lines.push(`• Target delivery: ${options.deliveryTimeline}`);
    }

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
        subject: `RFQ: ${answers.projectName} - LED Display Systems`,
        recipientCompany: manufacturer,
        recipientEmail: undefined,
        projectName: answers.projectName,
        clientName: answers.clientName,
        location: answers.location,
        lineItems,
        deliveryTimeline: options?.deliveryTimeline,
        specialRequirements,
        bodyText,
        generatedAt: new Date().toISOString(),
    };
}
