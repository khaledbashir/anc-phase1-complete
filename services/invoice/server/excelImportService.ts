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

    // 1. Primary Data Source: "LED Cost Sheet"
    const ledSheet = workbook.Sheets['LED Cost Sheet'];
    if (!ledSheet) throw new Error('Sheet "LED Cost Sheet" not found');
    const ledData: any[][] = xlsx.utils.sheet_to_json(ledSheet, { header: 1 });

    // 2. Secondary Data Sources: Install tabs
    const installInBowlSheet = workbook.Sheets['Install (In-Bowl)'];
    const installConcourseSheet = workbook.Sheets['Install (Concourse)'];

    const installInBowlData: any[][] = installInBowlSheet ? xlsx.utils.sheet_to_json(installInBowlSheet, { header: 1 }) : [];
    const installConcourseData: any[][] = installConcourseSheet ? xlsx.utils.sheet_to_json(installConcourseSheet, { header: 1 }) : [];

    const screens: any[] = [];
    const perScreenAudits: ScreenAudit[] = [];

    // Iterate through "LED Cost Sheet" to find screen configurations
    // Based on the observed structure:
    // Row 0: Header (some title)
    // Row 1: Column Headers [Issue/Project Name, null, null, null, Pitch, Height, Width, ...]

    for (let i = 2; i < ledData.length; i++) {
        const row = ledData[i];
        const projectName = row[0];

        // Look for project name markers like "RB.05 - LED Ribbon..." or "LED.EXT.N.C..."
        if (typeof projectName === 'string' && (projectName.includes('LED') || projectName.includes('RB.'))) {
            const pitch = row[4];
            const heightFt = row[5];
            const widthFt = row[6];
            const quantity = row[11] || 1;
            const areaSqFt = row[12];
            const serviceType = row[14]; // "Top", "Front", etc.

            const hardwareCost = row[16]; // Display Cost
            const shippingCost = row[19]; // Shipping
            const totalCostBeforeMargin = row[20]; // Total Cost (Display + Shipping)
            const sellPrice = row[22]; // Price (after margin)
            const ancMargin = row[23]; // ANC Margin
            const bondCost = row[24]; // Bond Cost
            const finalClientTotal = row[25]; // Total with Bond

            // Now find corresponding Install data in "Install (In-Bowl)" or "Install (Concourse)"
            // The prompt indicates:
            // FABRICATE SECONDARY STEEL SUBSTRUCTURE -> structure cost
            // INSTALL SECONDARY STEEL SUBSTRUCTURE -> labor part 1
            // INSTALL LED DISPLAYS -> labor part 2
            // INSTALL CLADDING AND TRIM -> labor part 3
            // HEAVY EQUIPMENT -> pm/travel/etc.

            const installRowHeader = findInstallRow(installInBowlData, projectName) || findInstallRow(installConcourseData, projectName);

            let structureCost = hardwareCost * 0.2; // Default fallback (from old logic)
            let laborCost = hardwareCost * 0.15; // Default fallback
            let pmCost = areaSqFt * 0.5; // Default fallback

            if (installRowHeader) {
                structureCost = installRowHeader.structure;
                laborCost = installRowHeader.labor;
                pmCost = installRowHeader.pm;
            }

            const screen: any = {
                name: projectName,
                pitchMm: parseFloat(pitch),
                heightFt: parseFloat(heightFt),
                widthFt: parseFloat(widthFt),
                quantity: parseInt(quantity),
                serviceType: serviceType,
                costPerSqFt: row[15],
            };

            const audit: ScreenAudit = {
                name: projectName,
                productType: projectName.includes('RB.') ? 'Ribbon' : 'LED Display',
                quantity: quantity,
                areaSqFt: areaSqFt,
                pixelResolution: 0, // Calculate later or mark as 0
                breakdown: {
                    hardware: hardwareCost,
                    structure: structureCost,
                    install: laborCost, // Mapped to labor
                    labor: laborCost,
                    power: 0, // If available
                    shipping: shippingCost,
                    pm: pmCost,
                    generalConditions: 0,
                    travel: 0,
                    submittals: 0,
                    engineering: 0,
                    permits: 0,
                    cms: 0,
                    ancMargin: ancMargin,
                    sellPrice: sellPrice,
                    bondCost: bondCost,
                    marginAmount: ancMargin,
                    totalCost: totalCostBeforeMargin,
                    finalClientTotal: finalClientTotal,
                    sellingPricePerSqFt: row[26],
                }
            };

            // Populate lineItems for the PDF template (Summary Level)
            const totalSell = finalClientTotal;
            const hardwareSell = (hardwareCost / totalCostBeforeMargin) * totalSell;
            const structureSell = (structureCost / totalCostBeforeMargin) * totalSell;
            const laborSell = (laborCost / totalCostBeforeMargin) * totalSell;
            const otherSell = totalSell - hardwareSell - structureSell - laborSell;

            screen.lineItems = [
                { id: `hw-${i}`, category: 'LED Display System', price: hardwareSell },
                { id: `st-${i}`, category: 'Structural Materials', price: structureSell },
                { id: `inst-${i}`, category: 'Installation & Labor', price: laborSell },
                { id: `other-${i}`, category: 'Electrical, Data & Conditions', price: otherSell },
            ];

            screens.push(screen);
            perScreenAudits.push(audit);
        }
    }

    // Aggregate totals
    const totals = perScreenAudits.reduce((acc, curr) => {
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
            margin: acc.margin + b.marginAmount,
            totalCost: acc.totalCost + b.totalCost,
            finalClientTotal: acc.finalClientTotal + b.finalClientTotal,
            sellingPricePerSqFt: 0, // Calculate weighted avg
        };
    }, {
        hardware: 0, structure: 0, install: 0, labor: 0, power: 0, shipping: 0, pm: 0,
        generalConditions: 0, travel: 0, submittals: 0, engineering: 0, permits: 0, cms: 0,
        ancMargin: 0, sellPrice: 0, bondCost: 0, margin: 0, totalCost: 0, finalClientTotal: 0,
        sellingPricePerSqFt: 0
    });

    const internalAudit: InternalAudit = {
        perScreen: perScreenAudits,
        totals: totals
    };

    return {
        clientName: ledData[0][0]?.replace('Project Name: ', '') || 'New Project',
        proposalName: 'LED Display Proposal',
        screens,
        internalAudit
    };
}

function findInstallRow(data: any[][], projectName: string) {
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (row[0] === projectName) {
            // Found the screen block in Install tab
            // Search for keywords below this row
            let structure = 0;
            let labor = 0;
            let pm = 0;

            for (let j = i + 1; j < data.length && j < i + 50; j++) {
                const subRow = data[j];
                const label = subRow[0];
                if (typeof label !== 'string') continue;

                if (label.includes('FABRICATE SECONDARY STEEL')) structure = subRow[9] || 0;
                if (label.includes('INSTALL SECONDARY STEEL')) labor += subRow[9] || 0;
                if (label.includes('INSTALL LED DISPLAYS')) labor += subRow[9] || 0;
                if (label.includes('INSTALL CLADDING AND TRIM')) labor += subRow[9] || 0;
                if (label.includes('PM/GENERAL CONDITIONS/TRAVEL')) pm = subRow[9] || 0;

                // Stop if we hit the next project
                if (label.includes('LED.') || label.includes('RB.')) break;
            }
            return { structure, labor, pm };
        }
    }
    return null;
}
