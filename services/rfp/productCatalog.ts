/**
 * Product Catalog — Phase 2 Intelligence Mode
 *
 * LED display product types with validated density constants.
 * All constants reverse-engineered from Westfield WTC RFP Exhibit G forms.
 *
 * Core principle: Power and weight are calculated from TOTAL ACTIVE AREA × DENSITY.
 * Cabinet topology (uniform vs mixed) is irrelevant for these calculations.
 *
 * See: /docs/phase2-rfp-intelligence-spec.md for full validation data.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProductType {
    id: string;
    name: string;
    manufacturer: string;
    pitchMm: number;
    /** Watts per square meter of active display area */
    powerDensityWm2: number;
    /** Pounds per square meter of active display area (includes internal structure) */
    weightDensityLbm2: number;
    /** Average power as fraction of max power */
    avgMaxRatio: number;
    /** Brightness in nits */
    brightnessNits: number;
    /** Pixels per square foot */
    pixelDensityPPF: number;
    /** Color temperature range */
    colorTempK: { nominal: number; min: number; max: number };
    /** LED diode type */
    diode: string;
    /** Processing hardware */
    processing: string;
    /** Hardware module name */
    hardware: string;
    /** Expected lifespan in hours */
    lifespanHours: number;
    /** Default cabinet dimensions (mm). Null if product uses custom sizes. */
    defaultCabinet: CabinetSize | null;
    /** For products with two cabinet variants (e.g., 2.5mm standard + small) */
    smallCabinet: CabinetSize | null;
    /** Environment suitability */
    environment: "Indoor" | "Outdoor" | "Both";
}

export interface CabinetSize {
    widthMm: number;
    heightMm: number;
    depthMm: number;
    weightKg: number;
    maxPowerW: number;
}

export type ZoneClass = "standard" | "medium" | "large" | "complex";

export interface LocationSpec {
    name: string;
    productId: string;
    /** Total pixel resolution from Exhibit G form or drawings */
    resolutionW: number;
    resolutionH: number;
    /** Panel grid from drawings (optional — used for cabinet solver) */
    panelsWide?: number;
    panelsHigh?: number;
    /** Zone classification for pricing */
    zoneClass: ZoneClass;
}

export interface ExhibitGOutput {
    /** Physical dimensions */
    displayWidthFt: number;
    displayHeightFt: number;
    displayWidthMm: number;
    displayHeightMm: number;
    /** Pixel resolution */
    resolutionW: number;
    resolutionH: number;
    /** Active area */
    activeAreaM2: number;
    activeAreaSqFt: number;
    /** Power */
    maxPowerW: number;
    avgPowerW: number;
    /** Weight (includes internal structure) */
    totalWeightLbs: number;
    /** Product constants (auto-filled) */
    brightnessNits: number;
    pixelDensityPPF: number;
    colorTempK: { nominal: number; min: number; max: number };
    diode: string;
    processing: string;
    hardware: string;
    pitchMm: number;
    lifespanHours: number;
    environment: "Indoor" | "Outdoor";
}

export interface PricingEstimate {
    installCost: number;
    pmCost: number;
    engCost: number;
    /** Hardware cost placeholder — requires product pricing data */
    hardwareCost: number | null;
    totalEstimate: number | null;
    alt1UpgradeCost: number | null;
    zoneClass: ZoneClass;
    zoneMultiplier: number;
    complexityModifier: number;
}

export interface CabinetTopology {
    type: "uniform" | "mixed" | "unknown";
    /** For uniform: all panels are this size */
    standardMm?: { width: number; height: number };
    standardCount?: number;
    /** For mixed: remainder panels */
    remainderMm?: { width: number; height: number };
    remainderCount?: number;
    /** Total display dimensions regardless of topology */
    totalWidthMm: number;
    totalHeightMm: number;
}

// ============================================================================
// PRODUCT CATALOG
// ============================================================================

const PRODUCTS: Record<string, ProductType> = {
    "4mm-nitxeon": {
        id: "4mm-nitxeon",
        name: "4mm Indoor (Nitxeon)",
        manufacturer: "Nitxeon",
        pitchMm: 4,
        powerDensityWm2: 488.3,
        weightDensityLbm2: 45.4,
        avgMaxRatio: 0.40,
        brightnessNits: 2000,
        pixelDensityPPF: 5806,
        colorTempK: { nominal: 6600, min: 3200, max: 9300 },
        diode: "Nationstar RS2020",
        processing: "Nova Star",
        hardware: "Nitxeon LED Module",
        lifespanHours: 100_000,
        defaultCabinet: {
            widthMm: 960, heightMm: 960, depthMm: 100,
            weightKg: 19, maxPowerW: 450,
        },
        smallCabinet: null,
        environment: "Indoor",
    },

    "10mm-mesh": {
        id: "10mm-mesh",
        name: "10mm Mesh P10 (Nitxeon)",
        manufacturer: "Nitxeon",
        pitchMm: 10,
        powerDensityWm2: 298.0,
        weightDensityLbm2: 19.6,
        avgMaxRatio: 0.40,
        brightnessNits: 1500,
        pixelDensityPPF: 929, // (1000/10)^2 / 10.764
        colorTempK: { nominal: 6600, min: 3200, max: 9300 },
        diode: "SMD Nationstar",
        processing: "Nova Star",
        hardware: "Nitxeon LED Module (Mesh)",
        lifespanHours: 100_000,
        defaultCabinet: {
            widthMm: 1680, heightMm: 1000, depthMm: 100,
            weightKg: 15, maxPowerW: 500,
        },
        smallCabinet: null,
        environment: "Indoor",
    },

    "2.5mm-mip": {
        id: "2.5mm-mip",
        name: "2.5mm Indoor (Nationstar MIP)",
        manufacturer: "Nationstar",
        pitchMm: 2.5,
        powerDensityWm2: 390.6,
        weightDensityLbm2: 52.6,
        avgMaxRatio: 0.33,
        brightnessNits: 2000,
        pixelDensityPPF: 14863,
        colorTempK: { nominal: 6700, min: 3200, max: 9300 },
        diode: "Nationstar MIP A1010WN",
        processing: "Nova Star",
        hardware: "Nationstar MIP Module",
        lifespanHours: 100_000,
        defaultCabinet: {
            widthMm: 480, heightMm: 960, depthMm: 91,
            weightKg: 11, maxPowerW: 180,
        },
        smallCabinet: {
            widthMm: 480, heightMm: 720, depthMm: 91,
            weightKg: 8.5, maxPowerW: 135,
        },
        environment: "Indoor",
    },
};

// ============================================================================
// CATALOG API
// ============================================================================

export function getProduct(id: string): ProductType | undefined {
    return PRODUCTS[id];
}

export function getAllProducts(): ProductType[] {
    return Object.values(PRODUCTS);
}

export function getProductByPitch(pitchMm: number): ProductType | undefined {
    return Object.values(PRODUCTS).find(p => p.pitchMm === pitchMm);
}

// ============================================================================
// EXHIBIT G CALCULATION ENGINE
// ============================================================================

/**
 * Calculate all Exhibit G form values from pixel resolution + product type.
 * Uses validated density constants (area × density).
 */
export function calculateExhibitG(
    product: ProductType,
    resolutionW: number,
    resolutionH: number,
): ExhibitGOutput {
    const displayWidthMm = resolutionW * product.pitchMm;
    const displayHeightMm = resolutionH * product.pitchMm;
    const displayWidthFt = displayWidthMm / 304.8;
    const displayHeightFt = displayHeightMm / 304.8;

    const activeAreaM2 = (displayWidthMm / 1000) * (displayHeightMm / 1000);
    const activeAreaSqFt = activeAreaM2 * 10.7639;

    const maxPowerW = Math.round(activeAreaM2 * product.powerDensityWm2);
    const avgPowerW = Math.round(maxPowerW * product.avgMaxRatio);
    const totalWeightLbs = Math.round(activeAreaM2 * product.weightDensityLbm2);

    return {
        displayWidthFt: round2(displayWidthFt),
        displayHeightFt: round2(displayHeightFt),
        displayWidthMm: Math.round(displayWidthMm),
        displayHeightMm: Math.round(displayHeightMm),
        resolutionW,
        resolutionH,
        activeAreaM2: round2(activeAreaM2),
        activeAreaSqFt: round2(activeAreaSqFt),
        maxPowerW,
        avgPowerW,
        totalWeightLbs,
        brightnessNits: product.brightnessNits,
        pixelDensityPPF: product.pixelDensityPPF,
        colorTempK: product.colorTempK,
        diode: product.diode,
        processing: product.processing,
        hardware: product.hardware,
        pitchMm: product.pitchMm,
        lifespanHours: product.lifespanHours,
        environment: product.environment === "Both" ? "Indoor" : product.environment,
    };
}

// ============================================================================
// ROM PRICING ESTIMATOR
// ============================================================================

export const INSTALL_COST_PER_LB = 50.0;
export const COMPLEX_MODIFIER = 1.2;
export const PM_BASE_FEE = 5882.35;
export const ENG_BASE_FEE = 4705.88;
export const ALT1_UPGRADE_RATIO = 0.07;

const ZONE_MULTIPLIERS: Record<ZoneClass, number> = {
    standard: 1,
    medium: 2,
    large: 3,
    complex: 1,
};

/**
 * Estimate pricing from Exhibit G output + zone classification.
 * Based on validated formulas from Westfield RFP (99.3% accuracy on install).
 */
export function estimatePricing(
    exhibitG: ExhibitGOutput,
    zoneClass: ZoneClass,
    hardwareCost?: number,
): PricingEstimate {
    const isComplex = zoneClass === "complex";
    const complexityModifier = isComplex ? COMPLEX_MODIFIER : 1.0;
    const zoneMultiplier = ZONE_MULTIPLIERS[zoneClass];

    const installCost = round2(exhibitG.totalWeightLbs * INSTALL_COST_PER_LB * complexityModifier);
    const pmCost = round2(PM_BASE_FEE * zoneMultiplier);
    const engCost = round2(ENG_BASE_FEE * zoneMultiplier);

    const hw = hardwareCost ?? null;
    const totalEstimate = hw !== null ? round2(hw + installCost + pmCost + engCost) : null;
    const alt1UpgradeCost = hw !== null ? round2(hw * ALT1_UPGRADE_RATIO) : null;

    return {
        installCost,
        pmCost,
        engCost,
        hardwareCost: hw,
        totalEstimate,
        alt1UpgradeCost,
        zoneClass,
        zoneMultiplier,
        complexityModifier,
    };
}

// ============================================================================
// CABINET TOPOLOGY SOLVER
// ============================================================================

const STANDARD_PIXEL_CANDIDATES = [240, 220, 200, 192, 180, 168, 100];

/**
 * Solve cabinet topology from total pixel resolution and panel count.
 * Returns uniform topology if pixels divide evenly, otherwise attempts
 * remainder solving for mixed-cabinet configurations.
 */
export function solveCabinetTopology(
    totalPixels: number,
    panelCount: number,
    pitchMm: number,
): CabinetTopology {
    const totalMm = totalPixels * pitchMm;

    // Step 1: Try uniform division
    const pxPerPanel = totalPixels / panelCount;
    if (Number.isInteger(pxPerPanel)) {
        const cabinetMm = pxPerPanel * pitchMm;
        return {
            type: "uniform",
            standardMm: { width: cabinetMm, height: cabinetMm },
            standardCount: panelCount,
            totalWidthMm: totalMm,
            totalHeightMm: totalMm,
        };
    }

    // Step 2: Single remainder — (N-1) standard + 1 remainder
    for (const stdPx of STANDARD_PIXEL_CANDIDATES) {
        const remainderPx = totalPixels - (panelCount - 1) * stdPx;
        if (remainderPx > 0 && remainderPx < stdPx && Number.isInteger(remainderPx)) {
            return {
                type: "mixed",
                standardMm: { width: stdPx * pitchMm, height: stdPx * pitchMm },
                standardCount: panelCount - 1,
                remainderMm: { width: remainderPx * pitchMm, height: remainderPx * pitchMm },
                remainderCount: 1,
                totalWidthMm: totalMm,
                totalHeightMm: totalMm,
            };
        }
    }

    // Step 3: Multi-remainder — N standard + M remainder
    for (const stdPx of STANDARD_PIXEL_CANDIDATES) {
        for (let nStd = 1; nStd < panelCount; nStd++) {
            const nRemainder = panelCount - nStd;
            const remainderPx = (totalPixels - nStd * stdPx) / nRemainder;
            if (remainderPx > 0 && Number.isInteger(remainderPx) && remainderPx !== stdPx) {
                return {
                    type: "mixed",
                    standardMm: { width: stdPx * pitchMm, height: stdPx * pitchMm },
                    standardCount: nStd,
                    remainderMm: { width: remainderPx * pitchMm, height: remainderPx * pitchMm },
                    remainderCount: nRemainder,
                    totalWidthMm: totalMm,
                    totalHeightMm: totalMm,
                };
            }
        }
    }

    // Step 4: Fallback — topology unknown, but area calc still works
    return {
        type: "unknown",
        totalWidthMm: totalMm,
        totalHeightMm: totalMm,
    };
}

/**
 * Solve cabinet topology for both axes of a display.
 */
export function solveDisplayTopology(
    resW: number,
    resH: number,
    panelsWide: number,
    panelsHigh: number,
    pitchMm: number,
): { width: CabinetTopology; height: CabinetTopology } {
    return {
        width: solveCabinetTopology(resW, panelsWide, pitchMm),
        height: solveCabinetTopology(resH, panelsHigh, pitchMm),
    };
}

// ============================================================================
// BUSINESS DAY CALCULATOR
// ============================================================================

/**
 * Add business days (Mon-Fri) to a date.
 * Validated against Westfield schedule — all 15 tasks match exactly.
 */
export function addBusinessDays(start: Date, days: number): Date {
    const result = new Date(start);
    let remaining = days;

    // If starting on a weekend, advance to Monday first
    const startDay = result.getDay();
    if (startDay === 0) { result.setDate(result.getDate() + 1); remaining--; }
    else if (startDay === 6) { result.setDate(result.getDate() + 2); remaining--; }

    // First day counts as day 1
    remaining--;

    while (remaining > 0) {
        result.setDate(result.getDate() + 1);
        const day = result.getDay();
        if (day !== 0 && day !== 6) {
            remaining--;
        }
    }

    return result;
}

/**
 * Get the next business day after a given date.
 */
export function nextBusinessDay(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day === 6) result.setDate(result.getDate() + 2);
    else if (day === 0) result.setDate(result.getDate() + 1);
    return result;
}

// ============================================================================
// HELPERS
// ============================================================================

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ============================================================================
// SCHEDULE TEMPLATES
// ============================================================================

export const PRE_INSTALL_PHASES = [
    { name: 'Notice to Proceed', days: 1 },
    { name: 'Design & Engineering', days: 38, dependsOn: 'Notice to Proceed' },
    { name: 'Secondary Structural Design', days: 30, dependsOn: 'Notice to Proceed', parallel: true },
    { name: 'Electrical Design', days: 30, dependsOn: 'Notice to Proceed', parallel: true },
    { name: 'Control Room Design', days: 30, dependsOn: 'Notice to Proceed', parallel: true },
    { name: 'Prep Submittals', days: 3, dependsOn: 'Design & Engineering' },
    { name: 'Owner Review & Approval', days: 5, dependsOn: 'Prep Submittals' },
    { name: 'LED Manufacturing', days: 45, dependsOn: 'Notice to Proceed', parallel: true },
    { name: 'Ocean Freight Shipping', days: 23, dependsOn: 'LED Manufacturing' },
    { name: 'Ground Shipping to Site', days: 4, dependsOn: 'Ocean Freight Shipping' },
    { name: 'Integration & Testing', days: 18, dependsOn: 'Ocean Freight Shipping', parallel: true },
    { name: 'Control System Programming', days: 10, dependsOn: 'Ocean Freight Shipping', parallel: true },
] as const;

export type InstallationType = 'standard_wall' | 'complex_hanging' | 'phased_large';

export const INSTALL_TASK_TEMPLATES = [
    { name: 'Mobilization', duration: { small: 1, medium: 1, large: 2 } },
    { name: 'Demolition', duration: { small: 1, medium: 2, large: 4 } },
    { name: 'Secondary Steel', duration: { small: 3, medium: 3, large: 3 }, onlyFor: ['complex_hanging'] as InstallationType[] },
    { name: 'LED Panel Install', duration: { small: 2, medium: 5, large: 17 } },
    { name: 'Infrastructure Install', duration: { small: 3, medium: 5, large: 9 }, parallelOffset: 2 },
    { name: 'Low Voltage Connectivity', duration: { small: 3, medium: 5, large: 9 }, parallelOffset: 2 },
    { name: 'Finishes & Trim', duration: { small: 1, medium: 1, large: 2 } },
] as const;

export const SIZE_THRESHOLDS = { small: 10, medium: 50 } as const;

export function getInstallSizeCategory(panelCount: number): 'small' | 'medium' | 'large' {
    if (panelCount < SIZE_THRESHOLDS.small) return 'small';
    if (panelCount < SIZE_THRESHOLDS.medium) return 'medium';
    return 'large';
}

// ============================================================================
// DOCUMENT MODES
// ============================================================================

export type DocumentMode = 'budget' | 'proposal' | 'loi';

export const DOCUMENT_MODES: Record<DocumentMode, {
    headerText: string;
    includeSignatures: boolean;
    includePaymentTerms: boolean;
    includeLegalIntro: boolean;
    includeProjectSummaryFirst: boolean;
    includeResponsibilityMatrix: boolean;
}> = {
    budget: {
        headerText: 'BUDGET ESTIMATE',
        includeSignatures: false,
        includePaymentTerms: false,
        includeLegalIntro: false,
        includeProjectSummaryFirst: false,
        includeResponsibilityMatrix: false,
    },
    proposal: {
        headerText: 'SALES QUOTATION',
        includeSignatures: false,
        includePaymentTerms: false,
        includeLegalIntro: false,
        includeProjectSummaryFirst: false,
        includeResponsibilityMatrix: false,
    },
    loi: {
        headerText: 'LETTER OF INTENT',
        includeSignatures: true,
        includePaymentTerms: true,
        includeLegalIntro: true,
        includeProjectSummaryFirst: true,
        includeResponsibilityMatrix: true,
    },
};

export const CURRENCY_FORMAT = {
    decimals: 0,
    hideZeroLineItems: true,
    removeTypeColumn: true,
} as const;

// ============================================================================
// CABINET TOPOLOGY HELPERS
// ============================================================================

export const KNOWN_4MM_PANEL_WIDTHS_PX = [120, 180, 192, 200, 220, 228, 240];
export const KNOWN_4MM_PANEL_HEIGHTS_PX = [180, 200, 240];
export const STANDARD_PIXELS_PER_PANEL = { '4mm': 240, '10mm': 100, '2.5mm': 384 };
export const STRUCTURAL_WEIGHT_BUFFER = 0.10;

// ============================================================================
// EXHIBIT G FIELD CLASSIFICATION
// ============================================================================

export const EXHIBIT_G_CONSTANT_FIELDS = [
    'moduleMfg', 'processorMfg', 'ledDiode', 'pixelPitch',
    'brightness', 'colorTemp', 'pixelDensity', 'lifespan',
] as const;

export const EXHIBIT_G_CALCULATED_FIELDS = [
    'screenWidthFt', 'screenHeightFt', 'screenWidthPx', 'screenHeightPx',
    'panelGrid', 'totalPanels', 'totalMaxPower', 'totalAvgPower', 'totalWeight',
] as const;
