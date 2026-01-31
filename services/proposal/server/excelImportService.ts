import * as xlsx from 'xlsx';
import { InternalAudit, ScreenAudit } from '@/lib/estimator';
import { formatDimension, formatCurrencyInternal } from '@/lib/math';
import { computeManifest } from '@/lib/verification';
import { detectExceptions } from '@/lib/exceptions';
import { VerificationManifest, Exception } from '@/types/verification';

interface ParsedANCProposal {
    formData: any; // Matches ProposalType structure
    internalAudit: InternalAudit;
    verificationManifest: VerificationManifest; // NEW: Verification manifest
    exceptions: Exception[]; // NEW: Detected exceptions
    excelData: any;
}

/**
 * Parses the ANC Master Excel spreadsheet to extract pre-calculated proposal data.
 * Focuses on 'LED Sheet', 'Install (In-Bowl)', and 'Install (Concourse)' tabs.
 */
export async function parseANCExcel(buffer: Buffer, fileName?: string): Promise<ParsedANCProposal> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // 1. Primary Data Source: "LED Sheet" (New format) or "LED Cost Sheet" (Legacy fallback)
    const ledSheet = workbook.Sheets['LED Sheet'] || workbook.Sheets['LED Cost Sheet'];
    if (!ledSheet) throw new Error('Sheet "LED Sheet" or "LED Cost Sheet" not found');
    const ledData: any[][] = xlsx.utils.sheet_to_json(ledSheet, { header: 1 });

    // 2. Financial Source of Truth: "Margin Analysis"
    const marginSheet = workbook.Sheets['Margin Analysis'];
    const marginData: any[][] = marginSheet ? xlsx.utils.sheet_to_json(marginSheet, { header: 1 }) : [];

    // --- ROBUST COLUMN MAPPING ---
    // Find the header row (the first real table header row, not a title row)
    let headerRowIndex = 1;
    const headerSearchLimit = Math.min(ledData.length, 20);
    for (let i = 0; i < headerSearchLimit; i++) {
        const row = ledData[i] || [];
        const first = (row[0] ?? "").toString().trim().toUpperCase();
        const hasOption = first === "OPTION" || row.some((c) => (c ?? "").toString().trim().toUpperCase() === "OPTION");
        const hasPitch = row.some((c) => (c ?? "").toString().trim().toUpperCase() === "PITCH");
        const hasDisplayName = row.some((c) => (c ?? "").toString().trim().toUpperCase() === "DISPLAY NAME");

        if ((hasOption && hasPitch) || hasDisplayName) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = ledData[headerRowIndex];
    if (!headers) throw new Error("Could not find header row in LED Sheet");

    const headerText = headers.map((h) => (h ?? "").toString().trim().toUpperCase());
    const isLedCostSheetFormat = headerText.includes("OPTION") && headerText.includes("PITCH") && headerText.includes("OF SCREENS");
    const nameHeaderIndex = headers.findIndex((h) => {
        const t = (h ?? "").toString().trim().toUpperCase();
        return t === "DISPLAY NAME" || t === "DISPLAY";
    });

    /**
     * REQ-126: STRICT HARD-CODED COLUMN MAPPING (Mirror Mode)
     * 
     * Per Master Truth mandate, we use FIXED column indices to prevent
     * mapping drift if Jeremy's master estimator spreadsheets change.
     * 
     * ANC Master Excel Column Mapping:
     * - Column A (0): Display Name
     * - Column E (4): MM Pitch  
     * - Column F (5): Height (ft)
     * - Column G (6): Width (ft)
     * - Column H (7): Resolution H (pixels)
     * - Column J (9): Resolution W (pixels)
     * - Column M (12): Brightness
     * 
     * Dynamic detection is DEPRECATED - only used as last resort fallback.
     */
    
    // REQ-126: STRICT FIXED INDICES (Master Truth)
    const FIXED_COLUMN_MAP = {
        name: 0,           // Column A - Display Name
        pitch: 4,          // Column E - MM Pitch
        height: 5,         // Column F - Height (ft)
        width: 6,          // Column G - Width (ft)
        pixelsH: 7,        // Column H - Resolution H
        pixelsW: 9,        // Column J - Resolution W
        brightnessNits: 12, // Column M - Brightness
        quantity: 11,      // Column L - Quantity (LED Cost Sheet format)
    };

    // Legacy dynamic detection (DEPRECATED - only for edge cases)
    const findCol = (regex: RegExp) => headers.findIndex(h => regex.test((h ?? "").toString().trim().toUpperCase()));

    const colIdx: any = isLedCostSheetFormat
        ? {
            // REQ-126: Use STRICT fixed indices for LED Cost Sheet format
            name: nameHeaderIndex >= 0 ? nameHeaderIndex : FIXED_COLUMN_MAP.name,
            quantity: FIXED_COLUMN_MAP.quantity,
            pitch: FIXED_COLUMN_MAP.pitch,
            height: FIXED_COLUMN_MAP.height,
            width: FIXED_COLUMN_MAP.width,
            pixelsH: FIXED_COLUMN_MAP.pixelsH,
            pixelsW: FIXED_COLUMN_MAP.pixelsW,
            brightnessNits: FIXED_COLUMN_MAP.brightnessNits,
            hdrStatus: -1,
            hardwareCost: headers.findIndex((h) => /DISPLAY\s*COST/i.test((h ?? "").toString())),
            installCost: -1,
            otherCost: -1,
            shippingCost: -1,
            totalCost: -1,
            sellPrice: -1,
            ancMargin: -1,
            bondCost: -1,
            finalTotal: -1,
        }
        : {
            // REQ-126: Use STRICT fixed indices for standard format
            name: nameHeaderIndex >= 0 ? nameHeaderIndex : FIXED_COLUMN_MAP.name,
            quantity: 2, // Standard format uses column C for quantity
            pitch: FIXED_COLUMN_MAP.pitch,
            height: FIXED_COLUMN_MAP.height,
            width: FIXED_COLUMN_MAP.width,
            pixelsH: FIXED_COLUMN_MAP.pixelsH,
            pixelsW: FIXED_COLUMN_MAP.pixelsW,
            brightnessNits: FIXED_COLUMN_MAP.brightnessNits,
            hdrStatus: -1,
            hardwareCost: 16,
            installCost: 17,
            otherCost: 18,
            shippingCost: 19,
            totalCost: 20,
            sellPrice: 22,
            ancMargin: 23,
            bondCost: 24,
            finalTotal: 25,
        };

    if (colIdx.hdrStatus === -1) {
        colIdx.hdrStatus = headers.findIndex((h) => typeof h === "string" && h.toLowerCase().includes("hdr"));
    }
    if (colIdx.brightnessNits === -1) {
        colIdx.brightnessNits = headers.findIndex((h) => typeof h === "string" && /nit|bright/i.test(h));
    }
    if (isLedCostSheetFormat) {
        if (colIdx.quantity === -1) colIdx.quantity = 11;
        if (colIdx.pitch === -1) colIdx.pitch = 4;
        if (colIdx.hardwareCost === -1) colIdx.hardwareCost = 16;
    }

    const marginRows = marginSheet ? parseMarginAnalysisRows(marginData) : [];
    const subTotalRow = marginRows.find((r) => r.name.toLowerCase().includes("sub total") && r.name.toLowerCase().includes("bid form")) || null;

    const screens: any[] = [];
    const perScreenAudits: ScreenAudit[] = [];
    let altRowsSkipped = 0;
    let blankRowsSkipped = 0;

    for (let i = headerRowIndex + 1; i < ledData.length; i++) {
        const row = ledData[i];
        const projectName = row[colIdx.name];

        // Valid project row usually has a name and numeric dimensions/pitch
        const normalizedName = typeof projectName === "string" ? projectName.trim().toLowerCase() : "";
        const nameCellUpper = (row[colIdx.name] ?? "").toString().trim().toUpperCase();
        const firstNonEmptyCellUpper = (() => {
            for (const c of row) {
                const t = (c ?? "").toString().trim();
                if (t.length > 0) return t.toUpperCase();
            }
            return "";
        })();

        if (
            nameCellUpper === "OPTION" ||
            nameCellUpper === "DISPLAY NAME" ||
            firstNonEmptyCellUpper === "OPTION" ||
            firstNonEmptyCellUpper === "DISPLAY NAME" ||
            row.some((c) => (c ?? "").toString().trim().toUpperCase() === "DISPLAY NAME")
        ) {
            continue;
        }

        const pitchNum = Number(row[colIdx.pitch]);
        const heightNum = Number(row[colIdx.height]);
        const widthNum = Number(row[colIdx.width]);

        if (
            typeof projectName === 'string' &&
            projectName.trim() !== "" &&
            normalizedName !== "option" &&
            Number.isFinite(pitchNum) &&
            pitchNum > 0 &&
            Number.isFinite(heightNum) &&
            heightNum > 0 &&
            Number.isFinite(widthNum) &&
            widthNum > 0
        ) {
            // REQ-111: Alternate Row Filter - Use startsWith to avoid false positives
            // Prevents "Altitude Display" from being incorrectly skipped
            if (normalizedName.startsWith('alt') || normalizedName.startsWith('alternate')) {
                altRowsSkipped++;
                continue;
            }

            const pitch = row[colIdx.pitch];
            const heightFt = row[colIdx.height];
            const widthFt = row[colIdx.width];
            const pixelsH = row[colIdx.pixelsH];
            const pixelsW = row[colIdx.pixelsW];

            // Brightness Row-Hide Logic
            let brightness = row[colIdx.brightnessNits];
            if (brightness === undefined || brightness === null || brightness === 0 || brightness === '0' || String(brightness).toUpperCase() === 'N/A' || String(brightness).trim() === '') {
                brightness = undefined;
            }

            const hdrValue = colIdx.hdrStatus !== -1 ? row[colIdx.hdrStatus] : null;
            const isHDR = hdrValue === true || String(hdrValue).toLowerCase() === 'yes' || String(hdrValue).toLowerCase() === 'true';

            const safeNumAt = (idx: number) => (idx >= 0 ? (Number(row[idx]) || 0) : 0);

            // Financial fields
            const hardwareCost = safeNumAt(colIdx.hardwareCost);
            const installCost = safeNumAt(colIdx.installCost);
            const otherCost = safeNumAt(colIdx.otherCost);
            const structureCost = safeNumAt(colIdx.installCost) * 0.5;
            const laborCost = safeNumAt(colIdx.installCost) * 0.5 + safeNumAt(colIdx.otherCost);
            const shippingCost = safeNumAt(colIdx.shippingCost);
            const totalCostBeforeMargin = safeNumAt(colIdx.totalCost) || hardwareCost + installCost + otherCost;
            const sellPrice = safeNumAt(colIdx.sellPrice);
            const ancMargin = safeNumAt(colIdx.ancMargin);
            const bondCost = safeNumAt(colIdx.bondCost);
            const finalClientTotal = safeNumAt(colIdx.finalTotal);

            const screen: any = {
                name: projectName,
                rowIndex: i + 1,
                pitchMm: formatDimension(pitch),
                heightFt: formatDimension(heightFt),
                widthFt: formatDimension(widthFt),
                pixelsH: parseInt(pixelsH) || 0,
                pixelsW: parseInt(pixelsW) || 0,
                brightnessNits: brightness,
                isHDR: isHDR,
                quantity: Number(colIdx.quantity >= 0 ? row[colIdx.quantity] : 1) || 1,
                lineItems: [],
                hardwareCost,
                installCost,
                otherCost,
                shippingCost,
                totalCost: totalCostBeforeMargin,
                sellPrice,
                ancMargin,
                bondCost,
                finalTotal: finalClientTotal,
            };

            let description = `Resolution: ${screen.pixelsH}h x ${screen.pixelsW}w. `;
            if (brightness) {
                description += `Brightness: ${brightness}.`;
            }
            screen.description = description;

            const marginRow = marginRows.length > 0 ? pickBestMarginRow(marginRows, projectName) : null;
            if (marginRow) {
                screen.totalCost = marginRow.cost;
                screen.sellPrice = marginRow.sell;
                screen.ancMargin = marginRow.marginAmount;
                screen.finalTotal = marginRow.sell;
                
                // Assign Group/Section from Margin Analysis
                screen.group = marginRow.section;
                
                // Mark as matched
                marginRow.matched = true;
            }

            const audit: ScreenAudit = {
                name: projectName,
                productType: 'LED Display',
                quantity: Number(colIdx.quantity >= 0 ? row[colIdx.quantity] : 1) || 1,
                areaSqFt: formatDimension((parseFloat(heightFt) || 0) * (parseFloat(widthFt) || 0)),
                pixelResolution: (parseInt(pixelsH) || 0) * (parseInt(pixelsW) || 0),
                pixelMatrix: `${pixelsH} x ${pixelsW} @ ${pitch}mm`,
                breakdown: {
                    hardware: formatCurrencyInternal(marginRow?.cost ?? hardwareCost),
                    structure: 0,
                    install: 0,
                    labor: 0,
                    power: 0,
                    shipping: 0,
                    pm: 0,
                    generalConditions: 0,
                    travel: 0,
                    submittals: 0,
                    engineering: 0,
                    permits: 0,
                    cms: 0,
                    demolition: 0,
                    ancMargin: formatCurrencyInternal(marginRow?.marginAmount ?? ancMargin),
                    sellPrice: formatCurrencyInternal(marginRow?.sell ?? sellPrice),
                    bondCost: 0,
                    totalCost: formatCurrencyInternal(marginRow?.cost ?? totalCostBeforeMargin),
                    finalClientTotal: marginRow?.sell ?? finalClientTotal,
                    sellingPricePerSqFt: heightFt && widthFt ? (marginRow?.sell ?? finalClientTotal) / (parseFloat(heightFt) * (parseFloat(widthFt) || 1)) : 0,
                    marginAmount: marginRow?.marginAmount ?? ancMargin,
                    boTaxCost: 0,
                    salesTaxCost: 0, // REQ-125: Sales tax (calculated at project level)
                    salesTaxRate: 0.095 // REQ-125: Default 9.5% tax rate
                }
            };

            screens.push(screen);
            perScreenAudits.push(audit);
        } else if (typeof projectName === 'string' && projectName.trim() !== "") {
            blankRowsSkipped++;
        }
    }

    const totals = aggregateTotals(perScreenAudits);
    if (subTotalRow) {
        totals.totalCost = Number(subTotalRow.cost || totals.totalCost);
        totals.sellPrice = Number(subTotalRow.sell || totals.sellPrice);
        totals.ancMargin = Number(subTotalRow.marginAmount || totals.ancMargin);
        totals.finalClientTotal = Number(subTotalRow.sell || totals.finalClientTotal);
    }
    const internalAudit: InternalAudit = {
        perScreen: perScreenAudits,
        totals: totals
    };

    // Construct the Unified FormData object
    // REQ-User-Feedback: Structure Margin Analysis data for exact PDF mirroring
    const marginAnalysis = groupMarginAnalysisRows(marginRows);

    const formData = {
        receiver: {
            name: ledData[0][0]?.replace('Project Name: ', '') || 'New Project',
        },
        details: {
            proposalName: 'ANC LED Display Proposal',
            screens,
            internalAudit,
            subTotal: totals.sellPrice, // REQ-User-Feedback: Explicit subtotal for PDF logic
            clientSummary: totals, // Initial summary
            mirrorMode: marginSheet ? true : false, // Auto-flip to mirror if Excel has details
            marginAnalysis, // NEW: Full structured data from Margin Analysis
        }
    };

    // VERIFICATION INTEGRATION: Compute manifest during Excel import
    // This captures control totals at the source (Excel) stage
    const excelData = {
        proposalId: 'pending', // Will be set when proposal is created
        fileName: typeof fileName === "string" && fileName.trim() !== "" ? fileName : 'import.xlsx',
        screens,
        rowCount: ledData.length,
        screenCount: screens.length,
        altRowsSkipped,
        blankRowsSkipped,
        headerRowIndex,
        sheetsRead: ['LED Sheet', 'Margin Analysis'].filter(Boolean),
    };

    const verificationManifest: VerificationManifest = computeManifest(
        excelData,
        internalAudit
    );

    // Detect exceptions early
    const exceptions = detectExceptions(verificationManifest);

    return {
        formData,
        internalAudit,
        verificationManifest, // NEW: Include verification manifest
        exceptions, // NEW: Include detected exceptions
        excelData,
    };
}

function parseMarginAnalysisRows(data: any[][]) {
    const rows: Array<{
        name: string;
        cost: number;
        sell: number;
        sellRaw: any; // Capture raw for "INCLUDED" check
        marginAmount: number;
        marginPct: number;
        rowIndex: number;
        section: string | null;
        isAlternate: boolean;
        isTotalLike: boolean;
        matched?: boolean;
    }> = [];

    const norm = (s: any) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

    let headerRow = -1;
    let costIndex = -1;
    let sellIndex = -1;
    let marginAmountIndex = -1;
    let marginPctIndex = -1;
    let labelIndex = -1;

    for (let i = 0; i < Math.min(data.length, 40); i++) {
        const row = data[i] || [];
        const rowText = row.map(norm);
        
        // Find indices dynamically
        const cIdx = rowText.findIndex(t => t === "cost");
        const sIdx = rowText.findIndex(t => t === "selling price" || t === "sell price");
        
        if (cIdx !== -1 && sIdx !== -1) {
            headerRow = i;
            costIndex = cIdx;
            sellIndex = sIdx;
            // Assume label is immediately to the left of cost
            labelIndex = cIdx - 1;
            
            // Try to find margin columns, otherwise assume relative positions
            const mIdx = rowText.findIndex(t => t === "margin $" || t === "margin amount" || t === "margin");
            const mpIdx = rowText.findIndex(t => t === "margin %" || t === "margin percent" || t === "%");
            
            marginAmountIndex = mIdx !== -1 ? mIdx : sIdx + 1;
            marginPctIndex = mpIdx !== -1 ? mpIdx : sIdx + 2;
            
            break;
        }
    }

    if (headerRow === -1) return rows;

    let currentSection: string | null = null;
    let isInAlternates = false;

    for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i] || [];
        
        // Use dynamic indices
        const labelRaw = labelIndex >= 0 ? row[labelIndex] : row[0];
        const label = typeof labelRaw === "string" ? labelRaw.trim() : "";
        const labelNorm = norm(labelRaw);

        const cost = costIndex >= 0 ? Number(row[costIndex]) : Number(row[1]);
        const sellRaw = sellIndex >= 0 ? row[sellIndex] : row[2];
        const sell = Number(sellRaw);
        const marginAmount = marginAmountIndex >= 0 ? Number(row[marginAmountIndex]) : Number(row[3]);
        const marginPct = marginPctIndex >= 0 ? Number(row[marginPctIndex]) : Number(row[4]);

        const numericRow =
            Number.isFinite(cost) &&
            Number.isFinite(sell) &&
            label.length > 0;

        const isTotalLike =
            labelNorm.includes("total") ||
            labelNorm.includes("sub total") ||
            labelNorm.includes("subtotal") ||
            labelNorm === "tax" ||
            labelNorm === "bond";

        if (!numericRow) {
            if (label.length > 0) {
                if (labelNorm.includes("alternates")) isInAlternates = true;
                if (labelNorm.includes("alternate") && labelNorm.includes("cost")) isInAlternates = true;
                if (!labelNorm.includes("revision") && !labelNorm.includes("project name")) {
                    currentSection = label;
                }
            }
            continue;
        }

        const isAlternate = isInAlternates || labelNorm.startsWith("alt") || labelNorm.startsWith("alternate");

        rows.push({
            name: label,
            cost: Number.isFinite(cost) ? cost : 0,
            sell: Number.isFinite(sell) ? sell : 0,
            sellRaw,
            marginAmount: Number.isFinite(marginAmount) ? marginAmount : 0,
            marginPct: Number.isFinite(marginPct) ? marginPct : 0,
            rowIndex: i + 1,
            section: currentSection,
            isAlternate,
            isTotalLike,
        });
    }

    return rows;
}

function groupMarginAnalysisRows(rows: ReturnType<typeof parseMarginAnalysisRows>) {
    const sections: Record<string, any> = {};
    const result: any[] = [];

    rows.forEach(row => {
        if (row.isTotalLike || row.isAlternate) return;

        const sectionName = row.section || "General";
        
        if (!sections[sectionName]) {
            sections[sectionName] = {
                name: sectionName,
                items: [],
                subTotal: 0
            };
            result.push(sections[sectionName]);
        }

        // Check for "INCLUDED" status
        const isIncluded = row.sell === 0 && (
            String(row.sellRaw).toLowerCase().includes("included") || 
            // Fallback: If it's a soft cost (not a screen) and $0, assume included if user context suggests it
            // For now, relying on explicit text or $0 value for non-hardware items might be tricky without more heuristics.
            // But per user request: "If an item's Selling Price is $0.00 in the Excel AND it's marked as a value-add: Show 'INCLUDED'"
            // We'll treat $0 as potentially included.
            row.sell === 0
        );

        sections[sectionName].items.push({
            name: row.name,
            sellingPrice: row.sell,
            isIncluded,
            raw: row
        });

        sections[sectionName].subTotal += row.sell;
    });

    return result;
}

function pickBestMarginRow(marginRows: ReturnType<typeof parseMarginAnalysisRows>, screenName: string) {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
    const s = norm(screenName);
    if (!s) return null;

    let best: { row: (typeof marginRows)[number]; score: number } | null = null;

    for (const row of marginRows) {
        if (row.isAlternate) continue;
        if (row.isTotalLike) continue;
        const r = norm(row.name);
        let score = 0;
        if (r.includes(s)) score = s.length;
        else if (s.includes(r)) score = r.length;
        if (score > 0 && (!best || score > best.score)) best = { row, score };
    }

    if (!best) return null;
    if (best.score < Math.min(10, s.length)) return null;
    return best.row;
}

function aggregateTotals(audits: ScreenAudit[]) {
    return audits.reduce((acc, curr) => {
        return {
            totalCost: acc.totalCost + (parseFloat(curr.breakdown.totalCost) || 0),
            sellPrice: acc.sellPrice + (parseFloat(curr.breakdown.sellPrice) || 0),
            ancMargin: acc.ancMargin + (curr.breakdown.marginAmount || 0),
            finalClientTotal: acc.finalClientTotal + (curr.breakdown.finalClientTotal || 0)
        };
    }, { totalCost: 0, sellPrice: 0, ancMargin: 0, finalClientTotal: 0 });
}
