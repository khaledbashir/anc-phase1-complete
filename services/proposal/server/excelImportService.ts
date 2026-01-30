import * as xlsx from 'xlsx';
import { InternalAudit, ScreenAudit } from '@/lib/estimator';
import { formatDimension, formatCurrencyInternal } from '@/lib/math';
import { computeManifest } from '@/lib/verification';
import { detectExceptions } from '@/lib/exceptions';
import { VerificationManifest } from '@/types/verification';

interface ParsedANCProposal {
    formData: any; // Matches ProposalType structure
    internalAudit: InternalAudit;
}

/**
 * Parses the ANC Master Excel spreadsheet to extract pre-calculated proposal data.
 * Focuses on 'LED Sheet', 'Install (In-Bowl)', and 'Install (Concourse)' tabs.
 */
export async function parseANCExcel(buffer: Buffer): Promise<ParsedANCProposal> {
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // 1. Primary Data Source: "LED Sheet" (New format) or "LED Cost Sheet" (Legacy fallback)
    const ledSheet = workbook.Sheets['LED Sheet'] || workbook.Sheets['LED Cost Sheet'];
    if (!ledSheet) throw new Error('Sheet "LED Sheet" or "LED Cost Sheet" not found');
    const ledData: any[][] = xlsx.utils.sheet_to_json(ledSheet, { header: 1 });

    // 2. Financial Source of Truth: "Margin Analysis"
    const marginSheet = workbook.Sheets['Margin Analysis'];
    const marginData: any[][] = marginSheet ? xlsx.utils.sheet_to_json(marginSheet, { header: 1 }) : [];

    // --- ROBUST COLUMN MAPPING ---
    // Find the header row (typically row 1 or 2, but let's be safe)
    let headerRowIndex = 1;
    for (let i = 0; i < Math.min(ledData.length, 5); i++) {
        if (ledData[i].includes('Display Name') || ledData[i].includes('Display')) {
            headerRowIndex = i;
            break;
        }
    }

    const headers = ledData[headerRowIndex];
    if (!headers) throw new Error("Could not find header row in LED Sheet");

    // REQ-111: Fixed Column Index Mapping for "Master Truth" precision
    // Using explicit column indices to prevent fuzzy matching errors
    const colIdx = {
        name: 0,           // Column A - Display Name
        pitch: 4,          // Column E - Pixel Pitch
        height: 5,         // Column F - Height
        width: 6,          // Column G - Width
        pixelsH: 7,        // Column H - Pixel H (Resolution Height)
        pixelsW: 9,        // Column J - Pixel W (Resolution Width)
        brightnessNits: 12, // Column M - Brightness (formerly "Nits")
        hdrStatus: -1,     // HDR column (search dynamically)
        hardwareCost: 16,  // LED Price
        installCost: 17,   // Install
        otherCost: 18,     // Other
        shippingCost: 19,  // Shipping
        totalCost: 20,     // Total Cost
        sellPrice: 22,     // Sell Price
        ancMargin: 23,     // Margin
        bondCost: 24,      // Bond
        finalTotal: 25,    // Total (Final)
    };

    // Dynamic search for HDR column if not at fixed position
    if (colIdx.hdrStatus === -1) {
        colIdx.hdrStatus = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('hdr'));
    }

    const screens: any[] = [];
    const perScreenAudits: ScreenAudit[] = [];

    for (let i = headerRowIndex + 1; i < ledData.length; i++) {
        const row = ledData[i];
        const projectName = row[colIdx.name];

        // Valid project row usually has a name and dimensions
        if (typeof projectName === 'string' && projectName.trim() !== "" && row[colIdx.pitch]) {
            // REQ-111: Alternate Row Filter - Use startsWith to avoid false positives
            // Prevents "Altitude Display" from being incorrectly skipped
            const normalizedName = projectName.trim().toLowerCase();
            if (normalizedName.startsWith('alt') || normalizedName.startsWith('alternate')) {
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

            // Financial fields
            const hardwareCost = Number(row[colIdx.hardwareCost] || 0);
            const structureCost = Number(row[colIdx.installCost] || 0) * 0.5; // Heuristic
            const laborCost = Number(row[colIdx.installCost] || 0) * 0.5 + Number(row[colIdx.otherCost] || 0);
            const shippingCost = Number(row[colIdx.shippingCost] || 0);
            const totalCostBeforeMargin = Number(row[colIdx.totalCost] || 0);
            const sellPrice = Number(row[colIdx.sellPrice] || 0);
            const ancMargin = Number(row[colIdx.ancMargin] || 0);
            const bondCost = Number(row[colIdx.bondCost] || 0);
            const finalClientTotal = Number(row[colIdx.finalTotal] || 0);

            const screen: any = {
                name: projectName,
                pitchMm: formatDimension(pitch),
                heightFt: formatDimension(heightFt),
                widthFt: formatDimension(widthFt),
                pixelsH: parseInt(pixelsH) || 0,
                pixelsW: parseInt(pixelsW) || 0,
                brightnessNits: brightness,
                isHDR: isHDR,
                quantity: 1,
                lineItems: []
            };

            let description = `Resolution: ${screen.pixelsH}h x ${screen.pixelsW}w. `;
            if (brightness) {
                description += `Brightness: ${brightness}.`;
            }
            screen.description = description;

            // MIRRORING LOGIC: Find this project in "Margin Analysis"
            if (marginSheet) {
                const mirroredItems = findMirrorItems(marginData, projectName);
                if (mirroredItems.length > 0) {
                    screen.lineItems = mirroredItems.map((item, idx) => ({
                        id: `mi-${i}-${idx}`,
                        category: item.name,
                        price: item.sellPrice,
                        description: screen.description
                    }));
                }
            }

            const audit: ScreenAudit = {
                name: projectName,
                productType: 'LED Display',
                quantity: 1,
                areaSqFt: formatDimension((parseFloat(heightFt) || 0) * (parseFloat(widthFt) || 0)),
                pixelResolution: (parseInt(pixelsH) || 0) * (parseInt(pixelsW) || 0),
                pixelMatrix: `${pixelsH} x ${pixelsW} @ ${pitch}mm`,
                breakdown: {
                    hardware: formatCurrencyInternal(hardwareCost),
                    structure: formatCurrencyInternal(structureCost),
                    install: 0,
                    labor: formatCurrencyInternal(laborCost),
                    power: 0,
                    shipping: formatCurrencyInternal(shippingCost),
                    pm: 0,
                    generalConditions: 0,
                    travel: 0,
                    submittals: 0,
                    engineering: 0,
                    permits: 0,
                    cms: 0,
                    demolition: 0,
                    ancMargin: formatCurrencyInternal(ancMargin),
                    sellPrice: formatCurrencyInternal(sellPrice),
                    bondCost: formatCurrencyInternal(bondCost),
                    totalCost: formatCurrencyInternal(totalCostBeforeMargin),
                    finalClientTotal: finalClientTotal,
                    sellingPricePerSqFt: heightFt && widthFt ? finalClientTotal / (parseFloat(heightFt) * parseFloat(widthFt)) : 0,
                    marginAmount: ancMargin,
                    boTaxCost: 0
                }
            };

            screens.push(screen);
            perScreenAudits.push(audit);
        }
    }

    const totals = aggregateTotals(perScreenAudits);
    const internalAudit: InternalAudit = {
        perScreen: perScreenAudits,
        totals: totals
    };

    // Construct the Unified FormData object
    const formData = {
        receiver: {
            name: ledData[0][0]?.replace('Project Name: ', '') || 'New Project',
        },
        details: {
            proposalName: 'ANC LED Display Proposal',
            screens,
            internalAudit,
            clientSummary: totals, // Initial summary
            mirrorMode: marginSheet ? true : false, // Auto-flip to mirror if Excel has details
        }
    };

    // VERIFICATION INTEGRATION: Compute manifest during Excel import
    // This captures control totals at the source (Excel) stage
    const excelData = {
        proposalId: 'pending', // Will be set when proposal is created
        fileName: 'import.xlsx', // Will be updated with actual filename
        screens,
        rowCount: ledData.length,
        screenCount: screens.length,
        altRowsSkipped: 0, // TODO: Track ALT rows skipped
        blankRowsSkipped: 0, // TODO: Track blank rows skipped
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
    };
}

function findMirrorItems(data: any[][], projectName: string): { name: string, sellPrice: number }[] {
    const items: { name: string, sellPrice: number }[] = [];
    let found = false;

    // Normalize match name
    const target = projectName.toLowerCase().trim();

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const cellA = row[0];

        if (typeof cellA === 'string' && cellA.toLowerCase().includes(target)) {
            found = true;
            for (let j = i + 1; j < data.length; j++) {
                const subRow = data[j];
                const label = subRow[0];
                const sellPrice = subRow[5];

                if (!label || (typeof label === 'string' && (label.toUpperCase().includes('TOTAL') || label.includes('RB.')))) {
                    break;
                }

                if (typeof sellPrice === 'number' && sellPrice > 0) {
                    items.push({ name: label, sellPrice });
                }
            }
            break;
        }
    }
    return items;
}

function aggregateTotals(audits: ScreenAudit[]) {
    const totals = audits.reduce((acc, curr) => {
        const b = curr.breakdown;
        return {
            hardware: acc.hardware + b.hardware,
            structure: acc.structure + b.structure,
            install: acc.install + b.install,
            labor: acc.labor + b.labor,
            power: acc.power + b.power,
            shipping: acc.shipping + b.shipping,
            pm: acc.pm + b.pm,
            generalConditions: acc.generalConditions + b.generalConditions,
            travel: acc.travel + b.travel,
            submittals: acc.submittals + b.submittals,
            engineering: acc.engineering + b.engineering,
            permits: acc.permits + b.permits,
            cms: acc.cms + b.cms,
            ancMargin: acc.ancMargin + b.ancMargin,
            sellPrice: acc.sellPrice + b.sellPrice,
            bondCost: acc.bondCost + b.bondCost,
            totalCost: acc.totalCost + b.totalCost,
            finalClientTotal: acc.finalClientTotal + b.finalClientTotal,
            demolition: (acc.demolition || 0) + (b.demolition || 0),
            margin: acc.margin + (b.marginAmount || 0),
            sellingPricePerSqFt: 0,
            boTaxCost: (acc.boTaxCost || 0) + (b.boTaxCost || 0)
        };
    }, {
        hardware: 0, structure: 0, install: 0, labor: 0, power: 0, shipping: 0, pm: 0,
        generalConditions: 0, travel: 0, submittals: 0, engineering: 0, permits: 0, cms: 0,
        ancMargin: 0, sellPrice: 0, bondCost: 0, totalCost: 0, finalClientTotal: 0, margin: 0,
        demolition: 0,
        sellingPricePerSqFt: 0,
        boTaxCost: 0
    });

    const totalArea = audits.reduce((sum, s) => sum + s.areaSqFt, 0);
    totals.sellingPricePerSqFt = totals.finalClientTotal / (totalArea || 1);

    return totals;
}
