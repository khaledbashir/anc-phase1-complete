import * as xlsx from 'xlsx';
import { InternalAudit, ScreenAudit } from '@/lib/estimator';

interface ParsedANCProposal {
    clientName: string;
    proposalName: string;
    screens: any[];
    internalAudit: InternalAudit;
}

/**
 * Parses the ANC Master Excel spreadsheet to extract pre-calculated proposal data.
 * Focuses on 'LED Cost Sheet', 'Install (In-Bowl)', and 'Install (Concourse)' tabs.
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

    const screens: any[] = [];
    const perScreenAudits: ScreenAudit[] = [];

    // Mapping for LED Sheet (Master format)
    // Col A: Display Name (0)
    // Col E: Pixel Pitch (4)
    // Col F: Height (5)
    // Col G: Width (6)
    // Col H: Pixel H (7)
    // Col J: Pixel W (9)
    // Col M: Brightness (12)

    for (let i = 2; i < ledData.length; i++) {
        const row = ledData[i];
        const projectName = row[0];

        // Valid project row usually has a name and dimensions
        if (typeof projectName === 'string' && projectName.trim() !== "" && row[4]) {
            const pitch = row[4];
            const heightFt = row[5];
            const widthFt = row[6];
            const pixelsH = row[7];
            const pixelsW = row[9];
            const brightness = row[12];

            // Financial fields on LED Sheet (fallbacks if Margin Analysis fails)
            const hardwareCost = row[16] || 0;
            const shippingCost = row[19] || 0;
            const totalCostBeforeMargin = row[20] || 0;
            const sellPrice = row[22] || 0;
            const ancMargin = row[23] || 0;
            const bondCost = row[24] || 0;
            const finalClientTotal = row[25] || 0;

            const screen: any = {
                name: projectName,
                pitchMm: parseFloat(pitch),
                heightFt: parseFloat(heightFt),
                widthFt: parseFloat(widthFt),
                pixelsH: parseInt(pixelsH),
                pixelsW: parseInt(pixelsW),
                brightness: brightness,
                quantity: 1,
                lineItems: []
            };

            // Enhance description with Brightness if available
            let description = `Resolution: ${pixelsH}h x ${pixelsW}w. `;
            if (brightness) {
                description += `Brightness: ${brightness} nits.`;
            }
            screen.description = description;

            // MIRRORING LOGIC: Find this project in "Margin Analysis"
            // The Margin Analysis tab is the real source of truth for PDF pricing tables.
            if (marginSheet) {
                const mirroredItems = findMirrorItems(marginData, projectName);
                if (mirroredItems.length > 0) {
                    screen.lineItems = mirroredItems.map((item, idx) => ({
                        id: `mi-${i}-${idx}`,
                        category: item.name,
                        price: item.sellPrice, // VEIL POLICY: Only selling price
                        description: screen.description
                    }));
                }
            }

            // Fallback if no margin data found
            if (screen.lineItems.length === 0) {
                screen.lineItems = [
                    { id: `hw-${i}`, category: 'Display System', price: sellPrice },
                ];
            }

            const audit: ScreenAudit = {
                name: projectName,
                productType: 'LED Display',
                quantity: 1,
                areaSqFt: heightFt * widthFt,
                pixelResolution: pixelsH * pixelsW,
                pixelMatrix: `${pixelsH} x ${pixelsW} @ ${pitch}mm`,
                breakdown: {
                    hardware: hardwareCost,
                    structure: 0,
                    install: 0,
                    labor: 0,
                    power: 0,
                    shipping: shippingCost,
                    pm: 0,
                    generalConditions: 0,
                    travel: 0,
                    submittals: 0,
                    engineering: 0,
                    permits: 0,
                    cms: 0,
                    demolition: 0,
                    ancMargin: ancMargin,
                    sellPrice: sellPrice,
                    bondCost: bondCost,
                    totalCost: totalCostBeforeMargin,
                    finalClientTotal: finalClientTotal,
                    sellingPricePerSqFt: finalClientTotal / (heightFt * widthFt || 1),
                    marginAmount: ancMargin // back compat
                }
            };

            // If Margin Analysis exists, we can extract even more detailed audit per row if needed,
            // but for now we aggregate the screen-level financials.

            screens.push(screen);
            perScreenAudits.push(audit);
        }
    }

    // Aggregate totals for the internalAudit object
    const totals = aggregateTotals(perScreenAudits);

    const internalAudit: InternalAudit = {
        perScreen: perScreenAudits,
        totals: totals
    };

    return {
        clientName: ledData[0][0]?.replace('Project Name: ', '') || 'New Project',
        proposalName: 'ANC LED Display Proposal',
        screens,
        internalAudit
    };
}

/**
 * findMirrorItems: Finds the row group in Margin Analysis matching the screen name.
 * Respects row order and excludes internal metrics (costs/margins).
 */
function findMirrorItems(data: any[][], projectName: string): { name: string, sellPrice: number }[] {
    const items: { name: string, sellPrice: number }[] = [];
    let found = false;

    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const cellA = row[0];

        if (typeof cellA === 'string' && cellA.includes(projectName)) {
            found = true;
            // Found the header, now look at subsequent rows until next project or empty
            for (let j = i + 1; j < data.length; j++) {
                const subRow = data[j];
                const label = subRow[0];
                const sellPrice = subRow[5]; // Assuming sell price is Col F (5) in Margin Analysis

                if (!label || (typeof label === 'string' && (label.includes('LED') || label.includes('RB.')))) {
                    break; // End of group
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
            sellingPricePerSqFt: 0 // calc below
        };
    }, {
        hardware: 0, structure: 0, install: 0, labor: 0, power: 0, shipping: 0, pm: 0,
        generalConditions: 0, travel: 0, submittals: 0, engineering: 0, permits: 0, cms: 0,
        ancMargin: 0, sellPrice: 0, bondCost: 0, totalCost: 0, finalClientTotal: 0, margin: 0,
        demolition: 0,
        sellingPricePerSqFt: 0
    });

    const totalArea = audits.reduce((sum, s) => sum + s.areaSqFt, 0);
    totals.sellingPricePerSqFt = totals.finalClientTotal / (totalArea || 1);

    return totals;
}
