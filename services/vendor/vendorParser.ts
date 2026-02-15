/**
 * Vendor Ingestion Parser — "Rosetta Stone" for LED vendor spec sheets.
 *
 * Parses vendor PDF/Excel from LG, Yaham, Absen etc. and extracts the
 * "Golden Metrics" that Matt needs:
 *   - Cabinet dimensions (mm)
 *   - Total resolution
 *   - Max/Typical power (W)
 *   - Weight (Kg → Lbs)
 *   - Heat load (BTU/hr, calculated from W)
 *   - Pixel pitch
 *   - IP rating
 *   - Brightness (nits)
 *
 * Handles the Imperial ↔ Metric bridge automatically.
 * Handles the "Double Power" logic (unit vs system total).
 */

import * as XLSX from "xlsx";

// ============================================================================
// TYPES
// ============================================================================

export interface VendorExtractedSpec {
    /** Source identification */
    manufacturer: string | null;
    modelNumber: string | null;
    productFamily: string | null;

    /** Physical — always stored in metric, displayed in both */
    pixelPitch: number | null;           // mm
    cabinetWidthMm: number | null;
    cabinetHeightMm: number | null;
    cabinetDepthMm: number | null;

    /** Layout — from vendor quote for a specific project */
    columnsCount: number | null;
    rowsCount: number | null;
    totalCabinets: number | null;
    totalWidthMm: number | null;
    totalHeightMm: number | null;

    /** Imperial conversions (calculated) */
    cabinetWidthFt: number | null;
    cabinetHeightFt: number | null;
    totalWidthFt: number | null;
    totalHeightFt: number | null;

    /** Weight */
    weightKgPerCabinet: number | null;
    totalWeightKg: number | null;
    totalWeightLbs: number | null;

    /** Electrical */
    maxPowerWPerCabinet: number | null;
    typicalPowerWPerCabinet: number | null;
    totalMaxPowerW: number | null;
    totalTypicalPowerW: number | null;

    /** Calculated from power */
    heatLoadBtu: number | null;

    /** Optical */
    maxNits: number | null;
    refreshRate: number | null;

    /** Resolution */
    resolutionW: number | null;
    resolutionH: number | null;

    /** Environmental */
    ipRating: string | null;
    environment: string | null;        // "indoor" | "outdoor" | "indoor_outdoor"

    /** Confidence & provenance */
    confidence: "high" | "medium" | "low";
    warnings: string[];
    rawMatches: Record<string, string>;  // What we matched, for debugging
}

// ============================================================================
// REGEX PATTERNS — Match vendor spec format variations
// ============================================================================

const PATTERNS = {
    // Pixel pitch: "3.9mm", "P3.9", "Pitch: 3.9mm", "3.9 mm pixel pitch"
    pixelPitch: [
        /(?:pixel\s*pitch|pitch)\s*[:=]?\s*(\d+\.?\d*)\s*mm/i,
        /[Pp](\d+\.?\d*)/,
        /(\d+\.?\d*)\s*mm\s*(?:pixel\s*)?pitch/i,
    ],

    // Cabinet dimensions: "960×540mm", "960mm x 540mm", "W: 960mm H: 540mm"
    cabinetSize: [
        /cabinet\s*(?:size|dimension)?\s*[:=]?\s*(\d+\.?\d*)\s*(?:mm)?\s*[×xX*]\s*(\d+\.?\d*)\s*(?:mm)?/i,
        /(?:module|panel)\s*(?:size|dimension)?\s*[:=]?\s*(\d+\.?\d*)\s*(?:mm)?\s*[×xX*]\s*(\d+\.?\d*)\s*(?:mm)?/i,
        /(\d{3,4})\s*(?:mm)?\s*[×xX*]\s*(\d{3,4})\s*(?:mm)?/,
    ],

    // Weight: "28.5kg", "28.5 kg/panel", "Weight: 28.5 Kg"
    weightKg: [
        /weight\s*(?:per\s*(?:cabinet|panel|module))?\s*[:=]?\s*(\d+\.?\d*)\s*kg/i,
        /(\d+\.?\d*)\s*kg\s*(?:\/\s*(?:cabinet|panel|module))?/i,
    ],

    // Total weight: "Total weight: 285 kg", "System weight: 285kg"
    totalWeightKg: [
        /(?:total|system|overall)\s*weight\s*[:=]?\s*(\d+\.?\d*)\s*kg/i,
    ],

    // Max power per cabinet: "Max: 215W", "Maximum Power: 215W/panel"
    maxPowerPerCab: [
        /max(?:imum)?\s*(?:power)?\s*[:=]?\s*(\d+\.?\d*)\s*[Ww](?:\s*\/\s*(?:cabinet|panel|module))?/i,
        /(\d+\.?\d*)\s*[Ww]\s*(?:max|maximum)/i,
    ],

    // Typical power: "Typical: 72W", "Average Power: 72W"
    typicalPowerPerCab: [
        /(?:typical|average|avg|normal)\s*(?:power)?\s*[:=]?\s*(\d+\.?\d*)\s*[Ww]/i,
        /(\d+\.?\d*)\s*[Ww]\s*(?:typical|average)/i,
    ],

    // Total power: "Total Power: 2150W", "System Power: 2150W"
    totalPower: [
        /(?:total|system|overall)\s*(?:max(?:imum)?\s*)?power\s*[:=]?\s*(\d+\.?\d*)\s*[Ww]/i,
    ],

    // Brightness: "7500 nits", "Brightness: 7500 cd/m²"
    brightness: [
        /(?:brightness|luminance|max\s*brightness)\s*[:=]?\s*(\d+)\s*(?:nits|cd\/m)/i,
        /(\d{3,5})\s*(?:nits|cd\/m)/i,
    ],

    // Resolution: "512×288", "Resolution: 512 x 288 pixels"
    resolution: [
        /(?:total\s*)?resolution\s*[:=]?\s*(\d+)\s*[×xX]\s*(\d+)/i,
        /(\d{3,5})\s*[×xX]\s*(\d{3,5})\s*(?:pixels?|px)?/i,
    ],

    // IP rating: "IP65", "IP54"
    ipRating: [
        /\b(IP\s*\d{2})\b/i,
    ],

    // Refresh rate: "3840Hz", "Refresh Rate: 3840 Hz"
    refreshRate: [
        /(?:refresh\s*rate)\s*[:=]?\s*(\d+)\s*Hz/i,
        /(\d{3,5})\s*Hz/i,
    ],

    // Cabinet count / layout: "10 x 5 = 50 cabinets", "Layout: 10W × 5H"
    cabinetLayout: [
        /(\d+)\s*[×xX]\s*(\d+)\s*=?\s*(\d+)?\s*(?:cabinets?|panels?|modules?)/i,
        /layout\s*[:=]?\s*(\d+)\s*[WwCc]?\s*[×xX]\s*(\d+)\s*[HhRr]?/i,
    ],

    // Total screen size: "3360mm x 1890mm total", "Screen: 11.02ft × 6.2ft"
    totalSize: [
        /(?:total|screen|display|overall)\s*(?:size|dimension)?\s*[:=]?\s*(\d+\.?\d*)\s*(mm|ft|m)\s*[×xX]\s*(\d+\.?\d*)\s*(mm|ft|m)?/i,
    ],

    // Manufacturer detection
    manufacturer: [
        /\b(LG|Yaham|Absen|Unilumin|Leyard|Daktronics|SNA|Barco|Samsung|Sony|Christie|Planar)\b/i,
    ],

    // Model number patterns (vendor-specific)
    modelNumber: [
        /(?:model|part|sku)\s*(?:number|no|#)?\s*[:=]?\s*([A-Z0-9][\w-]{3,})/i,
        /\b([A-Z]{2,}[\-_]?\d{2,}[\w-]*)\b/, // e.g., "GSQA-039", "LAA025IF"
    ],

    // Depth: "depth: 85mm", "85mm deep"
    cabinetDepth: [
        /(?:depth|deep|thickness)\s*[:=]?\s*(\d+\.?\d*)\s*mm/i,
        /(\d+\.?\d*)\s*mm\s*(?:depth|deep|thick)/i,
    ],
};

// ============================================================================
// EXTRACTION ENGINE
// ============================================================================

function matchFirst(text: string, patterns: RegExp[]): RegExpMatchArray | null {
    for (const p of patterns) {
        const m = text.match(p);
        if (m) return m;
    }
    return null;
}

function matchAll(text: string, patterns: RegExp[]): RegExpMatchArray[] {
    const results: RegExpMatchArray[] = [];
    for (const p of patterns) {
        const m = text.match(p);
        if (m) results.push(m);
    }
    return results;
}

function mmToFt(mm: number): number {
    return Math.round((mm / 304.8) * 10000) / 10000;
}

function kgToLbs(kg: number): number {
    return Math.round(kg * 2.20462 * 100) / 100;
}

function wattsToBtn(w: number): number {
    return Math.round(w * 3.412);
}

/**
 * Extract vendor specs from raw text content (PDF text or Excel cell values).
 */
export function extractFromText(text: string): VendorExtractedSpec {
    const warnings: string[] = [];
    const rawMatches: Record<string, string> = {};

    // --- Manufacturer ---
    const mfgMatch = matchFirst(text, PATTERNS.manufacturer);
    const manufacturer = mfgMatch ? mfgMatch[1] : null;
    if (mfgMatch) rawMatches.manufacturer = mfgMatch[0];

    // --- Model ---
    const modelMatch = matchFirst(text, PATTERNS.modelNumber);
    const modelNumber = modelMatch ? modelMatch[1] : null;
    if (modelMatch) rawMatches.modelNumber = modelMatch[0];

    // --- Pixel Pitch ---
    const pitchMatch = matchFirst(text, PATTERNS.pixelPitch);
    const pixelPitch = pitchMatch ? parseFloat(pitchMatch[1]) : null;
    if (pitchMatch) rawMatches.pixelPitch = pitchMatch[0];

    // --- Cabinet Size ---
    const cabSizeMatch = matchFirst(text, PATTERNS.cabinetSize);
    let cabinetWidthMm = cabSizeMatch ? parseFloat(cabSizeMatch[1]) : null;
    let cabinetHeightMm = cabSizeMatch ? parseFloat(cabSizeMatch[2]) : null;
    if (cabSizeMatch) rawMatches.cabinetSize = cabSizeMatch[0];

    // --- Cabinet Depth ---
    const depthMatch = matchFirst(text, PATTERNS.cabinetDepth);
    const cabinetDepthMm = depthMatch ? parseFloat(depthMatch[1]) : null;
    if (depthMatch) rawMatches.cabinetDepth = depthMatch[0];

    // --- Weight ---
    const weightMatch = matchFirst(text, PATTERNS.weightKg);
    const weightKgPerCabinet = weightMatch ? parseFloat(weightMatch[1]) : null;
    if (weightMatch) rawMatches.weightKg = weightMatch[0];

    const totalWeightMatch = matchFirst(text, PATTERNS.totalWeightKg);
    let totalWeightKg = totalWeightMatch ? parseFloat(totalWeightMatch[1]) : null;
    if (totalWeightMatch) rawMatches.totalWeightKg = totalWeightMatch[0];

    // --- Power (with Double Power logic) ---
    const maxPowerMatch = matchFirst(text, PATTERNS.maxPowerPerCab);
    let maxPowerPerCab = maxPowerMatch ? parseFloat(maxPowerMatch[1]) : null;
    if (maxPowerMatch) rawMatches.maxPowerPerCab = maxPowerMatch[0];

    const typPowerMatch = matchFirst(text, PATTERNS.typicalPowerPerCab);
    let typicalPowerPerCab = typPowerMatch ? parseFloat(typPowerMatch[1]) : null;
    if (typPowerMatch) rawMatches.typicalPowerPerCab = typPowerMatch[0];

    const totalPowerMatch = matchFirst(text, PATTERNS.totalPower);
    let totalMaxPowerW = totalPowerMatch ? parseFloat(totalPowerMatch[1]) : null;
    if (totalPowerMatch) rawMatches.totalPower = totalPowerMatch[0];

    // --- Brightness ---
    const nitsMatch = matchFirst(text, PATTERNS.brightness);
    const maxNits = nitsMatch ? parseInt(nitsMatch[1]) : null;
    if (nitsMatch) rawMatches.brightness = nitsMatch[0];

    // --- Resolution ---
    const resMatch = matchFirst(text, PATTERNS.resolution);
    const resolutionW = resMatch ? parseInt(resMatch[1]) : null;
    const resolutionH = resMatch ? parseInt(resMatch[2]) : null;
    if (resMatch) rawMatches.resolution = resMatch[0];

    // --- IP Rating ---
    const ipMatch = matchFirst(text, PATTERNS.ipRating);
    const ipRating = ipMatch ? ipMatch[1].replace(/\s/g, "") : null;
    if (ipMatch) rawMatches.ipRating = ipMatch[0];

    // --- Refresh Rate ---
    const rrMatch = matchFirst(text, PATTERNS.refreshRate);
    const refreshRate = rrMatch ? parseInt(rrMatch[1]) : null;
    if (rrMatch) rawMatches.refreshRate = rrMatch[0];

    // --- Cabinet Layout ---
    const layoutMatch = matchFirst(text, PATTERNS.cabinetLayout);
    let columnsCount = layoutMatch ? parseInt(layoutMatch[1]) : null;
    let rowsCount = layoutMatch ? parseInt(layoutMatch[2]) : null;
    let totalCabinets = layoutMatch?.[3] ? parseInt(layoutMatch[3]) : null;
    if (layoutMatch) rawMatches.cabinetLayout = layoutMatch[0];

    // Calculate total cabinets if not explicitly found
    if (columnsCount && rowsCount && !totalCabinets) {
        totalCabinets = columnsCount * rowsCount;
    }

    // --- Total Size ---
    const totalSizeMatch = matchFirst(text, PATTERNS.totalSize);
    let totalWidthMm: number | null = null;
    let totalHeightMm: number | null = null;
    if (totalSizeMatch) {
        rawMatches.totalSize = totalSizeMatch[0];
        const w = parseFloat(totalSizeMatch[1]);
        const wUnit = totalSizeMatch[2].toLowerCase();
        const h = parseFloat(totalSizeMatch[3]);
        const hUnit = (totalSizeMatch[4] || wUnit).toLowerCase();

        totalWidthMm = wUnit === "ft" ? w * 304.8 : wUnit === "m" ? w * 1000 : w;
        totalHeightMm = hUnit === "ft" ? h * 304.8 : hUnit === "m" ? h * 1000 : h;
    }

    // --- Double Power Logic ---
    // If maxPower > 2000W and we know cabinet count, it's probably system total
    if (maxPowerPerCab && maxPowerPerCab > 2000 && totalCabinets && totalCabinets > 1) {
        warnings.push(`Power ${maxPowerPerCab}W looks like system total — divided by ${totalCabinets} cabinets`);
        totalMaxPowerW = maxPowerPerCab;
        maxPowerPerCab = Math.round(maxPowerPerCab / totalCabinets);
    }

    // Calculate total power from per-cab if not found
    if (!totalMaxPowerW && maxPowerPerCab && totalCabinets) {
        totalMaxPowerW = maxPowerPerCab * totalCabinets;
    }

    // Calculate total typical power
    let totalTypicalPowerW: number | null = null;
    if (typicalPowerPerCab && totalCabinets) {
        totalTypicalPowerW = typicalPowerPerCab * totalCabinets;
    }

    // Calculate total weight
    if (!totalWeightKg && weightKgPerCabinet && totalCabinets) {
        totalWeightKg = weightKgPerCabinet * totalCabinets;
    }

    // Calculate total size from cabinet × layout
    if (!totalWidthMm && cabinetWidthMm && columnsCount) {
        totalWidthMm = cabinetWidthMm * columnsCount;
    }
    if (!totalHeightMm && cabinetHeightMm && rowsCount) {
        totalHeightMm = cabinetHeightMm * rowsCount;
    }

    // Environment detection from IP rating
    let environment: string | null = null;
    if (ipRating) {
        const ipNum = parseInt(ipRating.replace(/\D/g, ""));
        environment = ipNum >= 65 ? "outdoor" : ipNum >= 40 ? "indoor_outdoor" : "indoor";
    }

    // Confidence scoring
    const coreFieldsFound = [pixelPitch, cabinetWidthMm, maxPowerPerCab, weightKgPerCabinet].filter(Boolean).length;
    const confidence: "high" | "medium" | "low" =
        coreFieldsFound >= 3 ? "high" : coreFieldsFound >= 2 ? "medium" : "low";

    if (confidence === "low") {
        warnings.push("Low confidence — could only extract " + coreFieldsFound + " of 4 core specs");
    }

    return {
        manufacturer,
        modelNumber,
        productFamily: null,
        pixelPitch,
        cabinetWidthMm,
        cabinetHeightMm,
        cabinetDepthMm,
        columnsCount,
        rowsCount,
        totalCabinets,
        totalWidthMm,
        totalHeightMm,
        cabinetWidthFt: cabinetWidthMm ? mmToFt(cabinetWidthMm) : null,
        cabinetHeightFt: cabinetHeightMm ? mmToFt(cabinetHeightMm) : null,
        totalWidthFt: totalWidthMm ? mmToFt(totalWidthMm) : null,
        totalHeightFt: totalHeightMm ? mmToFt(totalHeightMm) : null,
        weightKgPerCabinet,
        totalWeightKg,
        totalWeightLbs: totalWeightKg ? kgToLbs(totalWeightKg) : null,
        maxPowerWPerCabinet: maxPowerPerCab,
        typicalPowerWPerCabinet: typicalPowerPerCab,
        totalMaxPowerW,
        totalTypicalPowerW,
        heatLoadBtu: totalMaxPowerW ? wattsToBtn(totalMaxPowerW) : null,
        maxNits,
        refreshRate,
        resolutionW,
        resolutionH,
        ipRating,
        environment,
        confidence,
        warnings,
        rawMatches,
    };
}

/**
 * Extract vendor specs from an Excel file buffer.
 * Scans all sheets, concatenates cell text, then runs extraction.
 */
export function extractFromExcel(buffer: Buffer): VendorExtractedSpec {
    const wb = XLSX.read(buffer, { type: "buffer" });

    // Concatenate all cell text across all sheets
    const allText: string[] = [];
    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
        for (let r = range.s.r; r <= range.e.r; r++) {
            const rowTexts: string[] = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                const addr = XLSX.utils.encode_cell({ r, c });
                const cell = ws[addr];
                if (cell && cell.v != null) {
                    rowTexts.push(String(cell.v));
                }
            }
            if (rowTexts.length > 0) {
                allText.push(rowTexts.join(" | "));
            }
        }
    }

    return extractFromText(allText.join("\n"));
}

/**
 * Compute the "Closest Fit" delta between requested dimensions and vendor actual.
 */
export function computeClosestFitDelta(
    requestedWidthFt: number,
    requestedHeightFt: number,
    vendorSpec: VendorExtractedSpec,
): {
    requestedW: string;
    requestedH: string;
    actualW: string;
    actualH: string;
    deltaW: string;
    deltaH: string;
    deltaWInches: number;
    deltaHInches: number;
    hasSignificantDelta: boolean;
    clientNote: string;
} | null {
    const actualWFt = vendorSpec.totalWidthFt;
    const actualHFt = vendorSpec.totalHeightFt;
    if (!actualWFt || !actualHFt) return null;

    const deltaWFt = actualWFt - requestedWidthFt;
    const deltaHFt = actualHFt - requestedHeightFt;
    const deltaWIn = Math.round(deltaWFt * 12 * 100) / 100;
    const deltaHIn = Math.round(deltaHFt * 12 * 100) / 100;
    const hasSig = Math.abs(deltaWIn) > 2 || Math.abs(deltaHIn) > 2;

    const fmtDelta = (v: number) => (v >= 0 ? `+${v}"` : `${v}"`);

    let clientNote = "";
    if (hasSig) {
        const parts: string[] = [];
        if (Math.abs(deltaWIn) > 2) parts.push(`${Math.abs(deltaWIn)}" ${deltaWIn > 0 ? "wider" : "narrower"}`);
        if (Math.abs(deltaHIn) > 2) parts.push(`${Math.abs(deltaHIn)}" ${deltaHIn > 0 ? "taller" : "shorter"}`);
        clientNote = `Note: Actual screen will be ${parts.join(" and ")} than architectural drawings due to module dimensions.`;
    }

    return {
        requestedW: `${requestedWidthFt.toFixed(2)} ft`,
        requestedH: `${requestedHeightFt.toFixed(2)} ft`,
        actualW: `${actualWFt.toFixed(4)} ft`,
        actualH: `${actualHFt.toFixed(4)} ft`,
        deltaW: fmtDelta(deltaWIn),
        deltaH: fmtDelta(deltaHIn),
        deltaWInches: deltaWIn,
        deltaHInches: deltaHIn,
        hasSignificantDelta: hasSig,
        clientNote,
    };
}
