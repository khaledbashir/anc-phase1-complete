/**
 * Estimator Questionnaire — Question definitions and flow logic
 *
 * Typeform-style: one question at a time, with dependencies.
 * Answers map directly to ScreenInput + project-level options for the estimator.
 *
 * Framework: 4 phases, 7 cost categories (3A-3G), ROM vs Detailed depth.
 */

// ============================================================================
// TYPES
// ============================================================================

export type QuestionType =
    | "text"
    | "number"
    | "select"
    | "multi-select"
    | "dimensions"    // Width × Height compound input
    | "yes-no"
    | "display-loop"  // Special: "Add another display?" branching
    | "section";      // Visual separator / phase header

export interface QuestionOption {
    value: string;
    label: string;
    description?: string;
}

export interface Question {
    id: string;
    phase: "project" | "display" | "financial" | "review";
    type: QuestionType;
    label: string;
    subtitle?: string;
    placeholder?: string;
    options?: QuestionOption[];
    defaultValue?: any;
    required?: boolean;
    /** Show only if this function returns true given current answers */
    showIf?: (answers: Record<string, any>, displayIndex: number) => boolean;
    /** Unit label shown after number inputs */
    unit?: string;
    /** Min/max for number inputs */
    min?: number;
    max?: number;
    step?: number;
    /** Which sheet tab this answer affects (for live preview highlighting) */
    affectsSheet?: string;
}

// ============================================================================
// PROJECT PHASE — Collected once
// ============================================================================

export const PROJECT_QUESTIONS: Question[] = [
    {
        id: "clientName",
        phase: "project",
        type: "text",
        label: "Who's the client?",
        subtitle: "Company or organization name",
        placeholder: "e.g., Indiana Fever, NBCU, USC Athletics",
        required: true,
        affectsSheet: "Budget Summary",
    },
    {
        id: "projectName",
        phase: "project",
        type: "text",
        label: "What's the project called?",
        subtitle: "Internal project name or venue",
        placeholder: "e.g., Gainbridge Fieldhouse LED Upgrade",
        required: true,
        affectsSheet: "Budget Summary",
    },
    {
        id: "location",
        phase: "project",
        type: "text",
        label: "Where is the project?",
        subtitle: "City, State — used for tax rates and labor multipliers",
        placeholder: "e.g., Indianapolis, IN",
        required: true,
        affectsSheet: "Budget Summary",
    },
    {
        id: "docType",
        phase: "project",
        type: "select",
        label: "What type of document?",
        subtitle: "This determines headers, signatures, and payment terms",
        options: [
            { value: "budget", label: "Budget Estimate", description: "Early-stage ROM with no commitments" },
            { value: "proposal", label: "Proposal", description: "Formal sales quotation" },
            { value: "loi", label: "Letter of Intent", description: "Full legal document with signatures" },
        ],
        defaultValue: "budget",
        required: true,
        affectsSheet: "Budget Summary",
    },
    {
        id: "estimateDepth",
        phase: "project",
        type: "select",
        label: "What level of detail?",
        subtitle: "ROM auto-calculates everything. Detailed unlocks per-category cost overrides.",
        options: [
            { value: "rom", label: "ROM / Budget", description: "Quick estimate — ~10 min, auto-calculate from area + complexity" },
            { value: "detailed", label: "Detailed", description: "Full breakdown — 7 cost categories per display, per-item overrides" },
        ],
        defaultValue: "rom",
        required: true,
        affectsSheet: "Budget Summary",
    },
    {
        id: "currency",
        phase: "project",
        type: "select",
        label: "Currency?",
        options: [
            { value: "USD", label: "USD", description: "US Dollar" },
            { value: "CAD", label: "CAD", description: "Canadian Dollar" },
            { value: "EUR", label: "EUR", description: "Euro" },
            { value: "GBP", label: "GBP", description: "British Pound" },
        ],
        defaultValue: "USD",
        affectsSheet: "Budget Summary",
    },
    {
        id: "isIndoor",
        phase: "project",
        type: "yes-no",
        label: "Indoor installation?",
        subtitle: "Affects environment ratings and material requirements",
        defaultValue: true,
        affectsSheet: "Display Details",
    },
    {
        id: "isNewInstall",
        phase: "project",
        type: "yes-no",
        label: "Is this a new installation?",
        subtitle: "No = replacement/upgrade of existing displays",
        defaultValue: true,
        affectsSheet: "Labor Worksheet",
    },
    {
        id: "isUnion",
        phase: "project",
        type: "yes-no",
        label: "Union labor required?",
        subtitle: "Union projects typically cost 15-25% more for labor",
        defaultValue: false,
        affectsSheet: "Labor Worksheet",
    },
];

// ============================================================================
// DISPLAY PHASE — Repeated per display
// ============================================================================

export const DISPLAY_QUESTIONS: Question[] = [
    {
        id: "displayName",
        phase: "display",
        type: "text",
        label: "Display name?",
        subtitle: "e.g., Main Scoreboard, Ribbon Board, Fascia Left",
        placeholder: "Main Scoreboard",
        required: true,
        affectsSheet: "Display Details",
    },
    {
        id: "locationType",
        phase: "display",
        type: "select",
        label: "What type of installation?",
        subtitle: "Determines structural and install cost models",
        options: [
            { value: "wall", label: "Wall Mount", description: "Flat wall, existing structure" },
            { value: "fascia", label: "Fascia / Balcony", description: "Mounted on fascia or balcony rail" },
            { value: "scoreboard", label: "Scoreboard / Center-Hung", description: "Suspended from ceiling/structure" },
            { value: "ribbon", label: "Ribbon Board", description: "Long, narrow display around venue perimeter" },
            { value: "freestanding", label: "Freestanding / Column", description: "Requires new structural support" },
            { value: "outdoor", label: "Outdoor / Marquee", description: "External, weather-rated" },
        ],
        required: true,
        affectsSheet: "Display Details",
    },
    {
        id: "dimensions",
        phase: "display",
        type: "dimensions",
        label: "Display dimensions?",
        subtitle: "Width and height in feet",
        required: true,
        affectsSheet: "Display Details",
    },
    {
        id: "pixelPitch",
        phase: "display",
        type: "select",
        label: "Pixel pitch?",
        subtitle: "Smaller pitch = higher resolution = higher cost",
        options: [
            { value: "1.2", label: "1.2mm", description: "Ultra-fine — premium indoor" },
            { value: "1.5", label: "1.5mm", description: "Fine — indoor close-view" },
            { value: "1.875", label: "1.875mm", description: "Fine — indoor standard" },
            { value: "2.5", label: "2.5mm", description: "Standard indoor" },
            { value: "3.9", label: "3.9mm", description: "Indoor/outdoor versatile" },
            { value: "4", label: "4mm", description: "Standard indoor/outdoor" },
            { value: "6", label: "6mm", description: "Outdoor medium distance" },
            { value: "10", label: "10mm", description: "Outdoor — large viewing distance" },
            { value: "16", label: "16mm", description: "Outdoor — highway/billboard" },
        ],
        defaultValue: "4",
        required: true,
        affectsSheet: "Display Details",
    },
    {
        id: "installComplexity",
        phase: "display",
        type: "select",
        label: "Install complexity?",
        subtitle: "Affects structural steel and labor rates",
        options: [
            { value: "simple", label: "Simple", description: "Basic wall mount, ground level access" },
            { value: "standard", label: "Standard", description: "Standard rigging, reasonable access" },
            { value: "complex", label: "Complex", description: "Difficult access, custom steel, multi-phase" },
            { value: "heavy", label: "Heavy", description: "Crane work, extreme heights, structural mods" },
        ],
        defaultValue: "standard",
        required: true,
        affectsSheet: "Labor Worksheet",
    },
    {
        id: "serviceType",
        phase: "display",
        type: "select",
        label: "Service access?",
        subtitle: "How will the display be serviced after install?",
        options: [
            { value: "Front/Rear", label: "Front / Rear", description: "Standard access — 20% structure" },
            { value: "Top", label: "Top Only", description: "Top-access only — 10% structure" },
        ],
        defaultValue: "Front/Rear",
        affectsSheet: "Labor Worksheet",
    },
    {
        id: "isReplacement",
        phase: "display",
        type: "yes-no",
        label: "Replacing an existing display?",
        subtitle: "Adds demolition costs if yes",
        defaultValue: false,
        affectsSheet: "Labor Worksheet",
    },
    {
        id: "useExistingStructure",
        phase: "display",
        type: "yes-no",
        label: "Can we use the existing structure?",
        subtitle: "Reduces structural costs significantly",
        defaultValue: false,
        showIf: (answers) => answers.isReplacement === true,
        affectsSheet: "Labor Worksheet",
    },
    {
        id: "includeSpareParts",
        phase: "display",
        type: "yes-no",
        label: "Include spare parts?",
        subtitle: "Typically 5% of LED hardware cost",
        defaultValue: true,
        affectsSheet: "Budget Summary",
    },
    {
        id: "addAnother",
        phase: "display",
        type: "display-loop",
        label: "Add another display?",
        subtitle: "You can add as many displays as the project needs",
    },
];

// ============================================================================
// FINANCIAL PHASE — Collected once after all displays
// ============================================================================

export const FINANCIAL_QUESTIONS: Question[] = [
    {
        id: "marginTier",
        phase: "financial",
        type: "select",
        label: "Margin tier?",
        subtitle: "Budget = lower margins for early-stage. Proposal = full margins for client-facing.",
        options: [
            { value: "budget", label: "Budget Tier", description: "LED: 15%, Services: 20% — for internal ROM estimates" },
            { value: "proposal", label: "Proposal Tier", description: "LED: 38%, Services: 20% — for client-facing quotes" },
        ],
        defaultValue: "budget",
        required: true,
        affectsSheet: "Margin Analysis",
    },
    {
        id: "ledMargin",
        phase: "financial",
        type: "number",
        label: "LED hardware margin?",
        subtitle: "Margin on LED panels and hardware. Budget: 15%, Proposal: 38%.",
        defaultValue: 15,
        unit: "%",
        min: 5,
        max: 60,
        step: 1,
        affectsSheet: "Margin Analysis",
    },
    {
        id: "servicesMargin",
        phase: "financial",
        type: "number",
        label: "Services margin?",
        subtitle: "Margin on labor, install, PM, engineering. Standard: 20%.",
        defaultValue: 20,
        unit: "%",
        min: 5,
        max: 60,
        step: 1,
        affectsSheet: "Margin Analysis",
    },
    {
        id: "defaultMargin",
        phase: "financial",
        type: "number",
        label: "Overall blended margin?",
        subtitle: "Fallback if you prefer a single margin. Divisor model: Sell = Cost / (1 - margin).",
        defaultValue: 30,
        unit: "%",
        min: 5,
        max: 60,
        step: 1,
        affectsSheet: "Margin Analysis",
    },
    {
        id: "bondRate",
        phase: "financial",
        type: "number",
        label: "Bond rate?",
        subtitle: "Performance bond — standard is 1.5%",
        defaultValue: 1.5,
        unit: "%",
        min: 0,
        max: 10,
        step: 0.1,
        affectsSheet: "Margin Analysis",
    },
    {
        id: "salesTaxRate",
        phase: "financial",
        type: "number",
        label: "Sales tax rate?",
        subtitle: "Location-dependent — NYC is 8.875%, default is 9.5%",
        defaultValue: 9.5,
        unit: "%",
        min: 0,
        max: 15,
        step: 0.125,
        affectsSheet: "Margin Analysis",
    },
    {
        id: "costPerSqFtOverride",
        phase: "financial",
        type: "number",
        label: "Override cost per sq ft?",
        subtitle: "Leave at 0 to use catalog-based pricing. Set a value to override for all displays.",
        defaultValue: 0,
        unit: "$/sqft",
        min: 0,
        max: 2000,
        step: 5,
        affectsSheet: "Display Details",
    },
];

// ============================================================================
// FLOW HELPERS
// ============================================================================

export interface EstimatorAnswers {
    // Project
    clientName: string;
    projectName: string;
    location: string;
    docType: "budget" | "proposal" | "loi";
    estimateDepth: "rom" | "detailed";
    currency: "USD" | "CAD" | "EUR" | "GBP";
    isIndoor: boolean;
    isNewInstall: boolean;
    isUnion: boolean;
    // Displays (array of per-display answers)
    displays: DisplayAnswers[];
    // Financial — tiered margins
    marginTier: "budget" | "proposal";
    ledMargin: number;       // LED hardware margin (separate from services)
    servicesMargin: number;  // Services/labor margin
    defaultMargin: number;   // Blended fallback
    bondRate: number;
    salesTaxRate: number;
    costPerSqFtOverride: number;
}

export interface DisplayAnswers {
    displayName: string;
    locationType: string;
    widthFt: number;
    heightFt: number;
    pixelPitch: string;
    installComplexity: string;
    serviceType: string;
    isReplacement: boolean;
    useExistingStructure: boolean;
    includeSpareParts: boolean;
}

export function getDefaultAnswers(): EstimatorAnswers {
    return {
        clientName: "",
        projectName: "",
        location: "",
        docType: "budget",
        estimateDepth: "rom",
        currency: "USD",
        isIndoor: true,
        isNewInstall: true,
        isUnion: false,
        displays: [],
        marginTier: "budget",
        ledMargin: 15,
        servicesMargin: 20,
        defaultMargin: 30,
        bondRate: 1.5,
        salesTaxRate: 9.5,
        costPerSqFtOverride: 0,
    };
}

export function getDefaultDisplayAnswers(): DisplayAnswers {
    return {
        displayName: "",
        locationType: "wall",
        widthFt: 0,
        heightFt: 0,
        pixelPitch: "4",
        installComplexity: "standard",
        serviceType: "Front/Rear",
        isReplacement: false,
        useExistingStructure: false,
        includeSpareParts: true,
    };
}

/**
 * Get all questions for the current flow state.
 * Returns a flat list with display questions expanded per display.
 */
export function getAllQuestions(displayCount: number): Question[] {
    const questions: Question[] = [...PROJECT_QUESTIONS];

    for (let i = 0; i < Math.max(displayCount, 1); i++) {
        questions.push(...DISPLAY_QUESTIONS.map((q) => ({
            ...q,
            id: `display_${i}_${q.id}`,
            label: displayCount > 0 && q.phase === "display" && q.id === "displayName"
                ? `Display ${i + 1} — what's it called?`
                : q.label,
        })));
    }

    questions.push(...FINANCIAL_QUESTIONS);
    return questions;
}

/**
 * Total question count for progress bar calculation
 */
export function getTotalQuestionCount(displayCount: number): number {
    const visibleDisplay = DISPLAY_QUESTIONS.filter((q) => q.type !== "display-loop");
    return PROJECT_QUESTIONS.length + (visibleDisplay.length * Math.max(displayCount, 1)) + FINANCIAL_QUESTIONS.length;
}
