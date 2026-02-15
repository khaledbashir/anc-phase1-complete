/**
 * EstimatorBridge — Converts questionnaire answers into estimator inputs
 * and transforms estimator output into Excel preview sheet data.
 *
 * This is the glue between:
 *   QuestionFlow (answers) → Estimator (calculations) → ExcelPreview (sheet data)
 */

import type { EstimatorAnswers, DisplayAnswers } from "./questions";

// ============================================================================
// TYPES — Sheet data for ExcelPreview
// ============================================================================

export interface SheetCell {
    value: string | number;
    bold?: boolean;
    header?: boolean;
    currency?: boolean;
    percent?: boolean;
    highlight?: boolean;
    formula?: string;
    align?: "left" | "center" | "right";
    span?: number;
}

export interface SheetRow {
    cells: SheetCell[];
    isHeader?: boolean;
    isSeparator?: boolean;
    isTotal?: boolean;
}

export interface SheetTab {
    name: string;
    color: string;
    columns: string[];
    rows: SheetRow[];
    active?: boolean;
}

export interface ExcelPreviewData {
    fileName: string;
    sheets: SheetTab[];
}

// ============================================================================
// CONSTANTS — From validated rate card
// ============================================================================

const DEFAULT_COST_PER_SQFT: Record<string, number> = {
    "1.2": 430,
    "1.5": 380,
    "1.875": 350,
    "2.5": 335,
    "3.9": 250,
    "4": 220,
    "6": 180,
    "10": 120,
    "16": 80,
};

const STEEL_RATES: Record<string, number> = {
    simple: 25,
    standard: 35,
    complex: 55,
    heavy: 75,
};

const LED_INSTALL_RATES: Record<string, number> = {
    simple: 75,
    standard: 105,
    complex: 145,
    heavy: 145,
};

const STRUCTURE_PCT: Record<string, number> = {
    "Front/Rear": 0.20,
    "Top": 0.10,
};

/** Optional rate card from DB — passed through from useRateCard hook */
export type RateCard = Record<string, number>;

/** Resolve a rate: DB rate card first, then hardcoded fallback */
function rc(rates: RateCard | undefined, key: string, fallback: number): number {
    return rates?.[key] ?? fallback;
}

// ============================================================================
// CALCULATION ENGINE (client-side, mirrors server estimator)
// ============================================================================

export interface ScreenCalc {
    name: string;
    widthFt: number;
    heightFt: number;
    areaSqFt: number;
    pixelPitch: number;
    pixelsW: number;
    pixelsH: number;
    totalPixels: number;
    costPerSqFt: number;
    hardwareCost: number;
    spareParts: number;
    structureCost: number;
    installCost: number;
    electricalCost: number;
    pmCost: number;
    engineeringCost: number;
    shippingCost: number;
    demolitionCost: number;
    totalCost: number;
    marginPct: number;
    sellPrice: number;
    bondCost: number;
    salesTaxCost: number;
    finalTotal: number;
}

export function calculateDisplay(d: DisplayAnswers, answers: EstimatorAnswers, rates?: RateCard): ScreenCalc {
    const w = d.widthFt || 0;
    const h = d.heightFt || 0;
    const area = w * h;
    const pitch = parseFloat(d.pixelPitch) || 4;

    const pixelsW = Math.round((w * 304.8) / pitch);
    const pixelsH = Math.round((h * 304.8) / pitch);

    // LED cost per sqft: user override > rate card > hardcoded pitch table
    const pitchKey = `led_cost.${d.pixelPitch.replace(".", "_")}mm`;
    const costPerSqFt = answers.costPerSqFtOverride > 0
        ? answers.costPerSqFtOverride
        : rc(rates, pitchKey, DEFAULT_COST_PER_SQFT[d.pixelPitch] || 120);

    const sparePartsPct = rc(rates, "spare_parts.led_pct", 0.05);
    const hardwareBase = area * costPerSqFt;
    const spareParts = d.includeSpareParts ? hardwareBase * sparePartsPct : 0;
    const hardware = hardwareBase + spareParts;

    const structPct = STRUCTURE_PCT[d.serviceType] || 0.20;
    const structureCost = d.useExistingStructure ? hardware * 0.05 : hardware * structPct;

    // Weight estimate: ~45 lbs/m² average, area in sqft → m² = area * 0.0929
    const estimatedWeightLbs = area * 0.0929 * 45;
    const steelRate = rc(rates, `install.steel_fab.${d.installComplexity}`, STEEL_RATES[d.installComplexity] || 35);
    const ledInstallRate = rc(rates, `install.led_panel.${d.installComplexity}`, LED_INSTALL_RATES[d.installComplexity] || 105);

    const installCost = (estimatedWeightLbs * steelRate) + (area * ledInstallRate);
    const electricalCost = area * rc(rates, "electrical.materials_per_sqft", 125);
    const complexMult = (d.installComplexity === "complex" || d.installComplexity === "heavy") ? rc(rates, "other.complex_modifier", 2) : 1;
    const pmCost = rc(rates, "other.pm_base_fee", 5882.35) * complexMult;
    const engineeringCost = rc(rates, "other.eng_base_fee", 4705.88) * complexMult;
    const shippingCost = estimatedWeightLbs * 0.5; // ~$0.50/lb shipping estimate
    const demolitionCost = d.isReplacement ? 5000 : 0;

    // Union labor multiplier (15% uplift on labor-related costs)
    const unionMult = answers.isUnion ? 1.15 : 1.0;
    const adjInstallCost = installCost * unionMult;
    const adjStructureCost = structureCost * unionMult;
    const adjElectricalCost = electricalCost * unionMult;

    const totalCost = hardware + adjStructureCost + adjInstallCost + adjElectricalCost + pmCost + engineeringCost + shippingCost + demolitionCost;

    // Tiered margins: separate LED hardware vs services margins
    const ledMarginPct = (answers.ledMargin || answers.defaultMargin || 30) / 100;
    const svcMarginPct = (answers.servicesMargin || answers.defaultMargin || 30) / 100;
    const serviceCost = adjStructureCost + adjInstallCost + adjElectricalCost + pmCost + engineeringCost + shippingCost + demolitionCost;
    const hardwareSell = hardware / (1 - ledMarginPct);
    const servicesSell = serviceCost / (1 - svcMarginPct);
    const sellPrice = hardwareSell + servicesSell;
    const marginPct = totalCost > 0 ? 1 - (totalCost / sellPrice) : 0;

    const bondRate = (answers.bondRate || 1.5) / 100;
    const bondCost = sellPrice * bondRate;

    const taxRate = (answers.salesTaxRate || 9.5) / 100;
    const salesTaxCost = (sellPrice + bondCost) * taxRate;

    const finalTotal = sellPrice + bondCost + salesTaxCost;

    return {
        name: d.displayName || "Unnamed Display",
        widthFt: w,
        heightFt: h,
        areaSqFt: area,
        pixelPitch: pitch,
        pixelsW,
        pixelsH,
        totalPixels: pixelsW * pixelsH,
        costPerSqFt,
        hardwareCost: hardware,
        spareParts,
        structureCost: adjStructureCost,
        installCost: adjInstallCost,
        electricalCost: adjElectricalCost,
        pmCost,
        engineeringCost,
        shippingCost,
        demolitionCost,
        totalCost,
        marginPct,
        sellPrice,
        bondCost,
        salesTaxCost,
        finalTotal,
    };
}

// ============================================================================
// BUILD PREVIEW SHEETS
// ============================================================================

function fmt(n: number): string {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

export function buildPreviewSheets(answers: EstimatorAnswers, rates?: RateCard): ExcelPreviewData {
    const clientName = answers.clientName || "Client";
    const fileName = `ANC_${clientName.replace(/\s+/g, "_")}_Cost_Analysis.xlsx`;

    const calcs = answers.displays.map((d) => calculateDisplay(d, answers, rates));

    const sheets: SheetTab[] = [
        buildProjectInfo(answers, calcs),
        buildBudgetSummary(answers, calcs),
        buildDisplayDetails(answers, calcs),
        buildLaborWorksheet(answers, calcs),
        buildMarginAnalysis(answers, calcs),
    ];

    sheets[0].active = true;
    return { fileName, sheets };
}

// --- Project Info ---
function buildProjectInfo(answers: EstimatorAnswers, calcs: ScreenCalc[]): SheetTab {
    const rows: SheetRow[] = [];
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    rows.push({
        cells: [{ value: "ANC COST ANALYSIS — PROJECT INFORMATION", bold: true, header: true, span: 2, align: "center" }],
        isHeader: true,
    });
    rows.push({ cells: [{ value: "" }], isSeparator: true });

    const infoRows: [string, string | number][] = [
        ["Client", answers.clientName || "—"],
        ["Project Name", answers.projectName || "—"],
        ["Location", answers.location || "—"],
        ["Date Created", now],
        ["Document Type", answers.docType === "budget" ? "Budget Estimate" : answers.docType === "loi" ? "Letter of Intent" : "Sales Quotation"],
        ["Estimate Depth", answers.estimateDepth === "rom" ? "ROM / Budget" : "Detailed"],
        ["Currency", answers.currency || "USD"],
        ["Environment", answers.isIndoor ? "Indoor" : "Outdoor"],
        ["New Installation", answers.isNewInstall ? "Yes" : "No"],
        ["Union Labor", answers.isUnion ? "Yes (+15%)" : "No"],
        ["Number of Displays", answers.displays.length],
    ];

    for (const [label, value] of infoRows) {
        rows.push({
            cells: [
                { value: label, bold: true },
                { value },
            ],
        });
    }

    rows.push({ cells: [{ value: "" }], isSeparator: true });
    rows.push({
        cells: [{ value: "FINANCIAL PARAMETERS", bold: true, header: true, span: 2 }],
        isHeader: true,
    });

    const financialRows: [string, string | number][] = [
        ["Margin Tier", answers.marginTier === "proposal" ? "Proposal (LED 38%, Svc 20%)" : "Budget (LED 15%, Svc 20%)"],
        ["LED Hardware Margin", `${answers.ledMargin || 15}%`],
        ["Services Margin", `${answers.servicesMargin || 20}%`],
        ["Default Blended Margin", `${answers.defaultMargin || 30}%`],
        ["Bond Rate", `${answers.bondRate || 1.5}%`],
        ["Sales Tax Rate", `${answers.salesTaxRate || 9.5}%`],
        ["Cost/sqft Override", answers.costPerSqFtOverride > 0 ? `$${answers.costPerSqFtOverride}` : "None (catalog pricing)"],
    ];

    for (const [label, value] of financialRows) {
        rows.push({
            cells: [
                { value: label, bold: true },
                { value },
            ],
        });
    }

    if (calcs.length > 0) {
        rows.push({ cells: [{ value: "" }], isSeparator: true });
        rows.push({
            cells: [{ value: "SUMMARY TOTALS", bold: true, header: true, span: 2 }],
            isHeader: true,
        });

        const totalCost = calcs.reduce((s, c) => s + c.totalCost, 0);
        const totalSell = calcs.reduce((s, c) => s + c.sellPrice, 0);
        const grandTotal = calcs.reduce((s, c) => s + c.finalTotal, 0);
        const blended = totalCost > 0 ? ((1 - totalCost / totalSell) * 100).toFixed(1) : "0";

        rows.push({ cells: [{ value: "Total Cost", bold: true }, { value: totalCost, currency: true }] });
        rows.push({ cells: [{ value: "Total Sell Price", bold: true }, { value: totalSell, currency: true }] });
        rows.push({ cells: [{ value: "Blended Margin", bold: true }, { value: `${blended}%` }] });
        rows.push({
            cells: [{ value: "Grand Total", bold: true }, { value: grandTotal, currency: true, bold: true, highlight: true }],
            isTotal: true,
        });
    }

    return {
        name: "Project Info",
        color: "#6366F1",
        columns: ["FIELD", "VALUE"],
        rows,
    };
}

// --- Budget Summary ---
function buildBudgetSummary(answers: EstimatorAnswers, calcs: ScreenCalc[]): SheetTab {
    const rows: SheetRow[] = [];
    const docLabel = answers.docType === "budget" ? "BUDGET ESTIMATE" : answers.docType === "loi" ? "LETTER OF INTENT" : "SALES QUOTATION";

    rows.push({
        cells: [{ value: `ANC ${docLabel} — ${answers.projectName || "PROJECT"}`, bold: true, header: true, span: 6, align: "center" }],
        isHeader: true,
    });
    rows.push({
        cells: [
            { value: `Client: ${answers.clientName || "—"}`, span: 3 },
            { value: `Location: ${answers.location || "—"}`, span: 3 },
        ],
    });
    rows.push({ cells: [{ value: "" }], isSeparator: true });
    rows.push({
        cells: [
            { value: "CATEGORY", bold: true, header: true },
            { value: "DESCRIPTION", bold: true, header: true },
            { value: "QTY", bold: true, header: true, align: "center" },
            { value: "UNIT", bold: true, header: true, align: "center" },
            { value: "COST", bold: true, header: true, align: "right" },
            { value: "SELLING PRICE", bold: true, header: true, align: "right" },
        ],
        isHeader: true,
    });

    if (calcs.length === 0) {
        rows.push({ cells: [{ value: "No displays configured yet", span: 6, align: "center" }] });
    } else {
        // LED Hardware
        rows.push({
            cells: [{ value: "1.0 LED HARDWARE", bold: true }, { value: "" }, { value: "" }, { value: "" }, { value: "" }, { value: "" }],
        });
        for (const c of calcs) {
            rows.push({
                cells: [
                    { value: "" },
                    { value: `${c.name} — ${c.pixelPitch}mm` },
                    { value: 1, align: "center" },
                    { value: "EA", align: "center" },
                    { value: c.hardwareCost, currency: true, align: "right" },
                    { value: c.hardwareCost / (1 - c.marginPct), currency: true, align: "right" },
                ],
            });
        }

        // Services
        rows.push({
            cells: [{ value: "2.0 SERVICES", bold: true }, { value: "Labor, PM & Eng" }, { value: "" }, { value: "" }, { value: "" }, { value: "" }],
        });
        for (const c of calcs) {
            const svcCost = c.installCost + c.structureCost + c.electricalCost + c.pmCost + c.engineeringCost + c.shippingCost + c.demolitionCost;
            rows.push({
                cells: [
                    { value: "" },
                    { value: `${c.name} — Install & Services` },
                    { value: 1, align: "center" },
                    { value: "LS", align: "center" },
                    { value: svcCost, currency: true, align: "right" },
                    { value: svcCost / (1 - c.marginPct), currency: true, align: "right" },
                ],
            });
        }

        // Totals
        rows.push({ cells: [{ value: "" }], isSeparator: true });
        const totalCost = calcs.reduce((s, c) => s + c.totalCost, 0);
        const totalSell = calcs.reduce((s, c) => s + c.sellPrice, 0);
        const totalBond = calcs.reduce((s, c) => s + c.bondCost, 0);
        const totalTax = calcs.reduce((s, c) => s + c.salesTaxCost, 0);
        const grandTotal = calcs.reduce((s, c) => s + c.finalTotal, 0);

        rows.push({
            cells: [{ value: "SUBTOTAL", bold: true }, { value: "" }, { value: "" }, { value: "" },
                { value: totalCost, currency: true, align: "right", bold: true },
                { value: totalSell, currency: true, align: "right", bold: true }],
            isTotal: true,
        });
        rows.push({
            cells: [{ value: `BOND (${answers.bondRate || 1.5}%)`, bold: true }, { value: "" }, { value: "" }, { value: "" }, { value: "" },
                { value: totalBond, currency: true, align: "right" }],
        });
        rows.push({
            cells: [{ value: `SALES TAX (${answers.salesTaxRate || 9.5}%)`, bold: true }, { value: "" }, { value: "" }, { value: "" }, { value: "" },
                { value: totalTax, currency: true, align: "right" }],
        });
        rows.push({ cells: [{ value: "" }], isSeparator: true });
        rows.push({
            cells: [{ value: "PROJECT TOTAL", bold: true }, { value: "" }, { value: "" }, { value: "" }, { value: "" },
                { value: grandTotal, currency: true, align: "right", bold: true, highlight: true }],
            isTotal: true,
        });
    }

    return {
        name: "Budget Summary",
        color: "#0A52EF",
        columns: ["CATEGORY", "DESCRIPTION", "QTY", "UNIT", "COST", "SELLING PRICE"],
        rows,
    };
}

// --- Display Details ---
function buildDisplayDetails(answers: EstimatorAnswers, calcs: ScreenCalc[]): SheetTab {
    const rows: SheetRow[] = [];

    rows.push({
        cells: [{ value: "LED DISPLAY TECHNICAL SPECIFICATIONS", bold: true, header: true, span: 8, align: "center" }],
        isHeader: true,
    });
    rows.push({ cells: [{ value: "" }], isSeparator: true });
    rows.push({
        cells: [
            { value: "DISPLAY", bold: true, header: true },
            { value: "TYPE", bold: true, header: true },
            { value: "W (ft)", bold: true, header: true, align: "center" },
            { value: "H (ft)", bold: true, header: true, align: "center" },
            { value: "SQ FT", bold: true, header: true, align: "center" },
            { value: "PITCH", bold: true, header: true, align: "center" },
            { value: "PIXELS", bold: true, header: true, align: "right" },
            { value: "$/SQFT", bold: true, header: true, align: "right" },
        ],
        isHeader: true,
    });

    if (calcs.length === 0) {
        rows.push({ cells: [{ value: "No displays configured yet", span: 8, align: "center" }] });
    } else {
        for (let i = 0; i < calcs.length; i++) {
            const c = calcs[i];
            const d = answers.displays[i];
            rows.push({
                cells: [
                    { value: c.name },
                    { value: d?.locationType || "wall" },
                    { value: c.widthFt, align: "center" },
                    { value: c.heightFt, align: "center" },
                    { value: Math.round(c.areaSqFt * 100) / 100, align: "center" },
                    { value: `${c.pixelPitch}mm`, align: "center" },
                    { value: c.totalPixels.toLocaleString(), align: "right" },
                    { value: c.costPerSqFt, currency: true, align: "right", highlight: true },
                ],
            });
        }
    }

    return {
        name: "Display Details",
        color: "#FFC107",
        columns: ["DISPLAY", "TYPE", "W (ft)", "H (ft)", "SQ FT", "PITCH", "PIXELS", "$/SQFT"],
        rows,
    };
}

// --- Labor Worksheet ---
function buildLaborWorksheet(answers: EstimatorAnswers, calcs: ScreenCalc[]): SheetTab {
    const rows: SheetRow[] = [];

    rows.push({
        cells: [{ value: "INSTALLATION & LABOR COSTS", bold: true, header: true, span: 7, align: "center" }],
        isHeader: true,
    });
    rows.push({ cells: [{ value: "" }], isSeparator: true });
    rows.push({
        cells: [
            { value: "DISPLAY", bold: true, header: true },
            { value: "STRUCTURAL", bold: true, header: true, align: "right" },
            { value: "INSTALL", bold: true, header: true, align: "right" },
            { value: "ELECTRICAL", bold: true, header: true, align: "right" },
            { value: "PM / ENG", bold: true, header: true, align: "right" },
            { value: "SHIPPING", bold: true, header: true, align: "right" },
            { value: "TOTAL", bold: true, header: true, align: "right" },
        ],
        isHeader: true,
    });

    if (calcs.length === 0) {
        rows.push({ cells: [{ value: "No displays configured yet", span: 7, align: "center" }] });
    } else {
        let totalStruct = 0, totalInstall = 0, totalElec = 0, totalPm = 0, totalShip = 0, totalAll = 0;

        for (const c of calcs) {
            const lineTotal = c.structureCost + c.installCost + c.electricalCost + c.pmCost + c.engineeringCost + c.shippingCost + c.demolitionCost;
            totalStruct += c.structureCost;
            totalInstall += c.installCost;
            totalElec += c.electricalCost;
            totalPm += c.pmCost + c.engineeringCost;
            totalShip += c.shippingCost;
            totalAll += lineTotal;

            rows.push({
                cells: [
                    { value: c.name },
                    { value: c.structureCost, currency: true, align: "right" },
                    { value: c.installCost, currency: true, align: "right" },
                    { value: c.electricalCost, currency: true, align: "right" },
                    { value: c.pmCost + c.engineeringCost, currency: true, align: "right" },
                    { value: c.shippingCost, currency: true, align: "right" },
                    { value: lineTotal, currency: true, align: "right", bold: true },
                ],
            });
        }

        rows.push({ cells: [{ value: "" }], isSeparator: true });
        rows.push({
            cells: [
                { value: "TOTAL", bold: true },
                { value: totalStruct, currency: true, align: "right", bold: true },
                { value: totalInstall, currency: true, align: "right", bold: true },
                { value: totalElec, currency: true, align: "right", bold: true },
                { value: totalPm, currency: true, align: "right", bold: true },
                { value: totalShip, currency: true, align: "right", bold: true },
                { value: totalAll, currency: true, align: "right", bold: true },
            ],
            isTotal: true,
        });
    }

    return {
        name: "Labor Worksheet",
        color: "#28A745",
        columns: ["DISPLAY", "STRUCTURAL", "INSTALL", "ELECTRICAL", "PM / ENG", "SHIPPING", "TOTAL"],
        rows,
    };
}

// --- Margin Analysis ---
function buildMarginAnalysis(answers: EstimatorAnswers, calcs: ScreenCalc[]): SheetTab {
    const rows: SheetRow[] = [];

    rows.push({
        cells: [{ value: "MARGIN ANALYSIS (MASTER TRUTH)", bold: true, header: true, span: 6, align: "center" }],
        isHeader: true,
    });
    rows.push({ cells: [{ value: "" }], isSeparator: true });
    rows.push({
        cells: [
            { value: "DISPLAY", bold: true, header: true },
            { value: "TOTAL COST", bold: true, header: true, align: "right" },
            { value: "MARGIN %", bold: true, header: true, align: "center" },
            { value: "SELL PRICE", bold: true, header: true, align: "right" },
            { value: "BOND", bold: true, header: true, align: "right" },
            { value: "FINAL TOTAL", bold: true, header: true, align: "right" },
        ],
        isHeader: true,
    });

    if (calcs.length === 0) {
        rows.push({ cells: [{ value: "No displays configured yet", span: 6, align: "center" }] });
    } else {
        for (const c of calcs) {
            rows.push({
                cells: [
                    { value: c.name },
                    { value: c.totalCost, currency: true, align: "right" },
                    { value: c.marginPct, percent: true, align: "center", highlight: true },
                    { value: c.sellPrice, currency: true, align: "right" },
                    { value: c.bondCost, currency: true, align: "right" },
                    { value: c.finalTotal, currency: true, align: "right", bold: true },
                ],
            });
        }

        const totalCost = calcs.reduce((s, c) => s + c.totalCost, 0);
        const totalSell = calcs.reduce((s, c) => s + c.sellPrice, 0);
        const totalBond = calcs.reduce((s, c) => s + c.bondCost, 0);
        const grandTotal = calcs.reduce((s, c) => s + c.finalTotal, 0);

        rows.push({ cells: [{ value: "" }], isSeparator: true });
        rows.push({
            cells: [
                { value: "PROJECT TOTAL", bold: true },
                { value: totalCost, currency: true, align: "right", bold: true },
                { value: calcs[0]?.marginPct || 0.30, percent: true, align: "center" },
                { value: totalSell, currency: true, align: "right", bold: true },
                { value: totalBond, currency: true, align: "right", bold: true },
                { value: grandTotal, currency: true, align: "right", bold: true, highlight: true },
            ],
            isTotal: true,
        });
    }

    return {
        name: "Margin Analysis",
        color: "#0A52EF",
        columns: ["DISPLAY", "TOTAL COST", "MARGIN %", "SELL PRICE", "BOND", "FINAL TOTAL"],
        rows,
    };
}
