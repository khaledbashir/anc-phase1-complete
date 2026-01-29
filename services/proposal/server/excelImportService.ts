import * as xlsx from 'xlsx';
import { InternalAudit, ScreenAudit } from '@/lib/estimator';
import { formatDimension, formatCurrencyInternal } from '@/lib/math';

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

    const getCol = (name: string) => headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes(name.toLowerCase()));

    const colIdx = {
        name: getCol('Display Name') !== -1 ? getCol('Display Name') : 0,    // Column A
        pitch: getCol('Pixel Pitch') !== -1 ? getCol('Pixel Pitch') : 4,    // Column E (Actually Pixel Count in prompt, but pitch in code)
        height: getCol('Height') !== -1 ? getCol('Height') : 5,             // Column F
        width: getCol('Width') !== -1 ? getCol('Width') : 6,               // Column G
        pixelsH: getCol('Pixel H') !== -1 ? getCol('Pixel H') : 7,          // Column H
        pixelsW: getCol('Pixel W') !== -1 ? getCol('Pixel W') : 9,          // Column J
        brightnessNits: getCol('Brightness') !== -1 ? getCol('Brightness') : 12, // Column M
        hdrStatus: getCol('HDR') !== -1 ? getCol('HDR') : -1,               // Search for HDR column
        hardwareCost: getCol('LED Price') !== -1 ? getCol('LED Price') : 16,
        installCost: getCol('Install') !== -1 ? getCol('Install') : 17,
        otherCost: getCol('Other') !== -1 ? getCol('Other') : 18,
        shippingCost: getCol('Shipping') !== -1 ? getCol('Shipping') : 19,
        totalCost: getCol('Total Cost') !== -1 ? getCol('Total Cost') : 20,
        sellPrice: getCol('Sell Price') !== -1 ? getCol('Sell Price') : 22,
        ancMargin: getCol('Margin') !== -1 ? getCol('Margin') : 23,
        bondCost: getCol('Bond') !== -1 ? getCol('Bond') : 24,
        finalTotal: getCol('Total') !== -1 ? (getCol('Total') === getCol('Total Cost') ? 25 : getCol('Total')) : 25,
    };

    const screens: any[] = [];
    const perScreenAudits: ScreenAudit[] = [];

    for (let i = headerRowIndex + 1; i < ledData.length; i++) {
        const row = ledData[i];
        const projectName = row[colIdx.name];

        // Valid project row usually has a name and dimensions
        if (typeof projectName === 'string' && projectName.trim() !== "" && row[colIdx.pitch]) {
            // BYPASS LOGIC: Ignore "Alternate" rows as per estimation standards
            if (projectName.toLowerCase().includes('alternate') || projectName.toLowerCase().includes('alt.')) {
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
                description += `Brightness: ${brightness} nits.`;
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

    return {
        formData,
        internalAudit
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
