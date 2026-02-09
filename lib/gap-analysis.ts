import { PDF_PLACEHOLDERS } from "./pdfPlaceholders";

/**
 * analyzeGaps - Project Health & Completion Logic
 * Identifies missing fields in the proposal to drive completion rates.
 * Implements "17/20 Logic": 80% AI fill rate target.
 */

export type GapItem = {
    id: string;
    field: string;
    screenIndex?: number;
    priority: "high" | "medium" | "low";
    description: string;
    section?: string;
};

// The 20 Critical Fields for a Ferrari-Level Proposal
const CRITICAL_FIELDS_COUNT = 20;

export function analyzeGaps(formValues: any): GapItem[] {
    const gaps: GapItem[] = [];
    const screens = formValues?.details?.screens || [];
    const details = formValues?.details || {};
    const sender = formValues?.sender || {};
    const receiver = formValues?.receiver || {};

    // 0. Reset State Check
    // If essential fields are all in their default/empty state, return no gaps.
    // This prevents "Project Health" from screaming at the user on a fresh load.
    const isDefaultClient = !receiver.name || receiver.name === PDF_PLACEHOLDERS.CLIENT_NAME;
    const isNoScreens = screens.length === 0;
    const isNoProjectName = !details.proposalName;

    if (isDefaultClient && isNoScreens && isNoProjectName) {
        return [];
    }

    // 1. Division 11 / Extraction Accuracy
    if (formValues?.extractionAccuracy !== "High") {
        gaps.push({
            id: "division-11-missing",
            field: "Division 11 Data",
            priority: "medium",
            description: "Section 11 63 10 not detected. Manual verification required.",
            section: "Confidence"
        });
    }

    // 2. Client Info
    if (!receiver.name || receiver.name === PDF_PLACEHOLDERS.CLIENT_NAME) {
        gaps.push({ id: "client-name", field: "Client Name", priority: "high", description: "Missing client name", section: "Client" });
    }
    if (!receiver.address) {
        gaps.push({ id: "client-addr", field: "Client Address", priority: "medium", description: "Missing client address", section: "Client" });
    }

    // 3. Sender Info (should be auto-filled but good to check)
    if (!sender.name) {
        gaps.push({ id: "sender-name", field: "Sender Name", priority: "low", description: "Missing sender identity", section: "Sender" });
    }

    // 4. Critical Rules / Rules Detected
    const rules = formValues?.rulesDetected || {};
    // If we haven't even run AI, rules might be missing entirely

    // 5. Screen Specs (The Meat)
    if (screens.length === 0) {
        gaps.push({ id: "no-screens", field: "Screens", priority: "high", description: "No displays found in proposal", section: "Screens" });
    } else {
        screens.forEach((screen: any, index: number) => {
            const label = `Screen ${index + 1}`;

            // Name
            if (!screen.name || screen.name === "Unnamed") {
                gaps.push({ id: `s${index}-name`, field: "Screen Name", screenIndex: index, priority: "medium", description: `${label} needs a descriptive name`, section: "Screens" });
            }

            // Dimensions
            if (!screen.widthFt) gaps.push({ id: `s${index}-w`, field: "Width", screenIndex: index, priority: "high", description: `${label} missing width`, section: "Screens" });
            if (!screen.heightFt) gaps.push({ id: `s${index}-h`, field: "Height", screenIndex: index, priority: "high", description: `${label} missing height`, section: "Screens" });

            // Pixel Specs
            if (!screen.pitchMm) gaps.push({ id: `s${index}-pitch`, field: "Pixel Pitch", screenIndex: index, priority: "high", description: `${label} missing pixel pitch`, section: "Screens" });

            // Brightness (HDR/Nits) - Lower priority, grouped
            if (!screen.brightness) {
                gaps.push({ id: `s${index}-brit`, field: "Brightness", screenIndex: index, priority: "low", description: `${label} missing brightness`, section: "Screens" });
            }



            // Margin / Financials (Internal only, but critical for completeness)
            if (!screen.costPerSqFt && details.pricingType !== "Budget") { // Only critical if hard quoting
                gaps.push({ id: `s${index}-cost`, field: "Cost Basis", screenIndex: index, priority: "high", description: `${label} missing cost basis`, section: "Financials" });
            }
        });
    }

    // 6. Project Metadata
    if (!details.proposalName) {
        gaps.push({ id: "prop-name", field: "Project Name", priority: "medium", description: "Missing project title", section: "General" });
    }
    if (!details.paymentTerms) {
        gaps.push({ id: "pay-terms", field: "Payment Terms", priority: "low", description: "Confirm payment terms", section: "Financials" });
    }

    // 7. Site Rules (Gap if unknown)
    // We expect these boolean flags to be explicitly set true/false. If undefined, it's a gap.
    // In our form, they default to false, so it's hard to tell if "unknown" or "no". 
    // We'll rely on the extraction logic to flag if it successfully ran. 

    return gaps;
}

export function calculateCompletionRate(gapCount: number, gaps?: GapItem[]): number {
    // Weight gaps by priority: high=2, medium=1, low=0.5
    // This makes the score more meaningful - missing critical fields hurts more
    if (gaps && gaps.length > 0) {
        const weightedGaps = gaps.reduce((sum, gap) => {
            if (gap.priority === "high") return sum + 2;
            if (gap.priority === "medium") return sum + 1;
            return sum + 0.5; // low priority
        }, 0);
        const maxWeight = CRITICAL_FIELDS_COUNT * 2; // Assume all high priority
        const score = Math.max(0, Math.min(100, ((maxWeight - weightedGaps) / maxWeight) * 100));
        return Math.round(score);
    }
    // Fallback to simple count if gaps array not provided
    const score = Math.max(0, Math.min(100, ((CRITICAL_FIELDS_COUNT - gapCount) / CRITICAL_FIELDS_COUNT) * 100));
    return Math.round(score);
}

