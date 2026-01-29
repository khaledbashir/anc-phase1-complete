/**
 * Audit-Ready Excel Export Service (Ferrari Edition)
 * 
 * Generates a "Formulaic" audit report for Finance.
 * Senior estimators can change inputs in Excel and see recalcs instantly.
 * 
 * Based on Standard Enterprise P&L Breakdown format.
 */

import ExcelJS from 'exceljs';
import { ScreenInput, ScreenAudit } from '@/lib/estimator';

export interface AuditExcelOptions {
    proposalName?: string;
    clientName?: string;
    proposalDate?: string;
    status?: 'DRAFT' | 'FINAL';
    boTaxApplies?: boolean;
}

// Standard P&L Categories (Standard Enterprise Gold Standard)
const PL_CATEGORIES = [
    { key: 'led', label: 'LED Display Hardware' },
    { key: 'install', label: 'Installation Labor' },
    { key: 'electrical', label: 'Electrical Work' },
    { key: 'travel', label: 'ANC Travel & Expenses' },
    { key: 'structural', label: 'Structural Engineering' },
    { key: 'electricalEng', label: 'Electrical Engineering' },
    { key: 'cms', label: 'CMS / Control System' },
    { key: 'partsLabor', label: 'Parts & Labor Warranty' },
    { key: 'tax', label: 'Sales Tax (if applicable)' },
    { key: 'bond', label: 'Performance Bond (1.5%)' },
];

/**
 * Generate Formulaic Audit Excel Workbook
 */
export async function generateAuditExcel(
    screens: any[],
    options?: AuditExcelOptions
): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ANC Natalia Intelligence Core';
    workbook.created = new Date();

    // Sheet 1: Internal Audit (Formulas)
    const auditSheet = workbook.addWorksheet('Internal Audit (Formulas)', {
        properties: { tabColor: { argb: 'FF0A52EF' } } // ANC French Blue
    });
    buildFormulaicAudit(auditSheet, screens, options);

    // Sheet 2: P&L Breakdown (Standard Format)
    const plSheet = workbook.addWorksheet('P&L Breakdown', {
        properties: { tabColor: { argb: 'FF28A745' } } // Green for finance
    });
    buildPLBreakdown(plSheet, screens, options);

    return workbook;
}


function buildFormulaicAudit(sheet: ExcelJS.Worksheet, screens: any[], options?: AuditExcelOptions) {
    // Header
    sheet.mergeCells('A1:G1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `ANC INTERNAL AUDIT & MARGIN ANALYSIS - ${options?.proposalName || 'PROPOSAL'}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A52EF' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = `Client: ${options?.clientName || 'N/A'} | Date: ${options?.proposalDate || new Date().toLocaleDateString()}`;
    sheet.getCell('A2').font = { italic: true };

    const HEADER_ROW = 4;
    let currentRow = 5;

    // Column Headers
    const headers = [
        { col: 'A', label: 'Screen / Section', width: 35 },
        { col: 'B', label: 'Metric', width: 25 },
        { col: 'C', label: 'Input Value', width: 15 },
        { col: 'D', label: 'Formula / Logic', width: 40 },
        { col: 'E', label: 'Total Cost', width: 18 },
        { col: 'F', label: 'Margin %', width: 12 },
        { col: 'G', label: 'Sell Price (Divisor)', width: 20 },
        { col: 'H', label: 'Tax/Bond Rate', width: 15 },
        { col: 'I', label: 'Final Item Total', width: 20 },
    ];

    headers.forEach(h => {
        const cell = sheet.getCell(`${h.col}${HEADER_ROW}`);
        cell.value = h.label;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }; // Dark grey
        cell.alignment = { horizontal: 'center' };
        sheet.getColumn(h.col).width = h.width;
    });

    screens.forEach((screen, idx) => {
        const audit = screen.internalAudit || screen._internalAudit || screen.audit;
        const b = audit?.breakdown || {};

        // Section Header
        sheet.mergeCells(`A${currentRow}:I${currentRow}`);
        const sectionCell = sheet.getCell(`A${currentRow}`);
        sectionCell.value = `DISPLAY ${idx + 1}: ${screen.name || 'Unnamed'}`;
        sectionCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        sectionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A52EF' } };
        currentRow++;

        // 1. HARDWARE SECTION (MODULE-BASED)
        const hwRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'Hardware (Module-First)';
        sheet.getCell(`B${currentRow}`).value = 'Area (SqFt)';
        sheet.getCell(`C${currentRow}`).value = audit?.areaSqFt || 0;
        sheet.getCell(`D${currentRow}`).value = 'Module Count * Module Size';

        // Cost per SqFt (Input)
        currentRow++;
        sheet.getCell(`B${currentRow}`).value = 'Unit Cost ($/SqFt)';
        sheet.getCell(`C${currentRow}`).value = screen.costPerSqFt || 120;
        sheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        sheet.getCell(`D${currentRow}`).value = 'YELLOW CELLS = FINANCE INPUTS';

        // Spare Parts Toggle (Visual indicator)
        currentRow++;
        sheet.getCell(`B${currentRow}`).value = 'Spare Parts (5%)';
        sheet.getCell(`C${currentRow}`).value = screen.includeSpareParts ? 'YES' : 'NO';
        sheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };

        // Hardware Total Cost Formula
        // E[hwRow] = C[hwRow] * C[hwRow+1] * (IF(C[hwRow+2]="YES", 1.05, 1))
        const costCell = sheet.getCell(`E${hwRow}`);
        costCell.value = {
            formula: `C${hwRow}*C${hwRow + 1}*(IF(C${hwRow + 2}="YES", 1.05, 1))`
        };
        costCell.numFmt = '"$"#,##0.00';
        costCell.font = { bold: true };

        currentRow++; // Move past spare parts row

        // 2. SOFT COSTS (PROXIED)
        currentRow++;
        sheet.getCell(`A${currentRow}`).value = 'Support Services';
        sheet.getCell(`B${currentRow}`).value = 'Install/Structure/Labor';
        const softCostTotal = (b.install || 0) + (b.labor || 0) + (b.structure || 0) + (b.power || 0) + (b.shipping || 0) + (b.pm || 0);
        sheet.getCell(`C${currentRow}`).value = softCostTotal;
        sheet.getCell(`C${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
        sheet.getCell(`D${currentRow}`).value = 'Est. Support Costs';
        sheet.getCell(`E${currentRow}`).value = { formula: `C${currentRow}` };
        sheet.getCell(`E${currentRow}`).numFmt = '"$"#,##0.00';

        // 3. FINAL MATH (THE DIVISOR)
        currentRow += 2;
        const totalCostRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'TOTAL COST (C)';
        sheet.getCell(`E${currentRow}`).value = { formula: `SUM(E${hwRow},E${currentRow - 2})` };
        sheet.getCell(`E${currentRow}`).font = { bold: true };
        sheet.getCell(`E${currentRow}`).numFmt = '"$"#,##0.00';

        currentRow++;
        const marginRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'DESIRED MARGIN (M)';
        sheet.getCell(`F${currentRow}`).value = screen.desiredMargin || 0.25;
        sheet.getCell(`F${currentRow}`).numFmt = '0%';
        sheet.getCell(`F${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Highlight Editable

        currentRow++;
        const sellPriceRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'SELL PRICE (P)';
        sheet.getCell(`D${currentRow}`).value = 'Natalia Math: Cost / (1 - Margin)';
        sheet.getCell(`G${currentRow}`).value = { formula: `E${totalCostRow}/(1-F${marginRow})` };
        sheet.getCell(`G${currentRow}`).font = { bold: true, color: { argb: 'FF0A52EF' } };
        sheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';

        // 4. TAX & BOND INPUTS (DYNAMIC)
        currentRow++;
        const bondRow = currentRow; // Swap order: Bond comes before or parallel to tax, but calculation requires Sell Price first.
        sheet.getCell(`A${currentRow}`).value = 'PERFORMANCE BOND (1.5%)';
        sheet.getCell(`D${currentRow}`).value = 'Sell Price * Bond Rate';
        sheet.getCell(`H${currentRow}`).value = 0.015; // Default 1.5% bond
        sheet.getCell(`H${currentRow}`).numFmt = '0.0%';
        sheet.getCell(`H${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow Input
        sheet.getCell(`I${currentRow}`).value = { formula: `G${sellPriceRow}*H${bondRow}` }; // Bond Value = Sell Price * Rate
        sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';

        currentRow++;
        const boTaxRow = currentRow; // Morgantown 2% Tax (REQ-48)
        sheet.getCell(`A${currentRow}`).value = 'CITY B&O TAX (2%)';
        sheet.getCell(`D${currentRow}`).value = '(Sell Price + Bond) * B&O Rate';
        sheet.getCell(`H${currentRow}`).value = options?.boTaxApplies ? 0.02 : 0;
        sheet.getCell(`H${currentRow}`).numFmt = '0.0%';
        sheet.getCell(`H${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow Input
        sheet.getCell(`I${currentRow}`).value = { formula: `(G${sellPriceRow}+I${bondRow})*H${boTaxRow}` };
        sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';

        currentRow++;
        const taxRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'SALES TAX';
        sheet.getCell(`D${currentRow}`).value = '(Sell Price + Bond + B&O) * Tax Rate';
        sheet.getCell(`H${currentRow}`).value = 0.095; // Default 9.5% tax
        sheet.getCell(`H${currentRow}`).numFmt = '0.0%';
        sheet.getCell(`H${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }; // Yellow Input
        sheet.getCell(`I${currentRow}`).value = { formula: `(G${sellPriceRow}+I${bondRow}+I${boTaxRow})*H${taxRow}` }; // Tax on (Sell + Bond + B&O)
        sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';

        currentRow++;
        sheet.getCell(`A${currentRow}`).value = 'FINAL CLIENT TOTAL';
        sheet.getCell(`I${currentRow}`).value = { formula: `G${sellPriceRow}+I${bondRow}+I${boTaxRow}+I${taxRow}` }; // Total = Sell + Bond + B&O + Tax
        sheet.getCell(`I${currentRow}`).font = { bold: true, size: 12 };
        sheet.getCell(`I${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';

        currentRow += 2; // Spacer
    });

    // Summary Totals at the bottom
    sheet.mergeCells(`A${currentRow}:I${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = 'GRAND TOTAL SUMMARY';
    sheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF34495E' } };
    sheet.getCell(`A${currentRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    currentRow++;

    sheet.getCell(`A${currentRow}`).value = 'PROJECT TOTAL';
    sheet.getCell(`I${currentRow}`).value = { formula: `SUMIF(A1:A${currentRow - 1}, "FINAL CLIENT TOTAL", I1:I${currentRow - 1})` };
    sheet.getCell(`I${currentRow}`).font = { bold: true, size: 14 };
    sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';
}

export async function generateAuditExcelBuffer(screens: any[], options?: AuditExcelOptions): Promise<Buffer> {
    const workbook = await generateAuditExcel(screens, options);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
}

/**
 * P&L Breakdown Sheet (Standard Enterprise Format)
 * 
 * Columns: Cost Category | Revenue | Budget | Committed POs | Budget Remaining
 */
function buildPLBreakdown(sheet: ExcelJS.Worksheet, screens: any[], options?: AuditExcelOptions) {
    // Header
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `P&L BREAKDOWN - ${options?.proposalName || 'PROJECT'} - ${options?.clientName || ''}`;
    titleCell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
    titleCell.alignment = { horizontal: 'center' };

    // Column Headers
    const headers = [
        { col: 'A', label: 'Cost Category', width: 30 },
        { col: 'B', label: 'Revenue (Sell)', width: 18 },
        { col: 'C', label: 'Budget (Cost)', width: 18 },
        { col: 'D', label: 'Committed POs', width: 18 },
        { col: 'E', label: 'Budget Remaining', width: 18 },
    ];

    const HEADER_ROW = 3;
    headers.forEach(h => {
        const cell = sheet.getCell(`${h.col}${HEADER_ROW}`);
        cell.value = h.label;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { horizontal: 'center' };
        sheet.getColumn(h.col).width = h.width;
    });

    let currentRow = HEADER_ROW + 1;

    // Aggregate costs from all screens
    const totals: Record<string, { revenue: number; budget: number; committed: number }> = {};
    PL_CATEGORIES.forEach(cat => {
        totals[cat.key] = { revenue: 0, budget: 0, committed: 0 };
    });

    screens.forEach(screen => {
        const audit = screen.internalAudit || screen._internalAudit || screen.audit;
        const b = audit?.breakdown || {};
        const margin = screen.desiredMargin || 0.25;

        // Hardware (LED)
        const hwCost = (audit?.areaSqFt || 0) * (screen.costPerSqFt || 120);
        const hwWithSpares = screen.includeSpareParts ? hwCost * 1.05 : hwCost;
        totals.led.budget += hwWithSpares;
        totals.led.revenue += hwWithSpares / (1 - margin);

        // Install
        totals.install.budget += b.install || 0;
        totals.install.revenue += (b.install || 0) / (1 - margin);

        // Electrical
        totals.electrical.budget += b.power || 0;
        totals.electrical.revenue += (b.power || 0) / (1 - margin);

        // Travel
        totals.travel.budget += b.shipping || 0;
        totals.travel.revenue += (b.shipping || 0) / (1 - margin);

        // Structural Engineering
        totals.structural.budget += b.structure || 0;
        totals.structural.revenue += (b.structure || 0) / (1 - margin);

        // CMS
        totals.cms.budget += b.cmsOptics || 0;
        totals.cms.revenue += (b.cmsOptics || 0) / (1 - margin);

        // Parts & Labor
        totals.partsLabor.budget += b.labor || 0;
        totals.partsLabor.revenue += (b.labor || 0) / (1 - margin);

        // PM
        totals.electricalEng.budget += b.pm || 0;
        totals.electricalEng.revenue += (b.pm || 0) / (1 - margin);
    });

    // Calculate Bond (1.5% of total revenue)
    const totalRevenue = Object.values(totals).reduce((sum, t) => sum + t.revenue, 0);
    totals.bond.revenue = totalRevenue * 0.015;
    totals.bond.budget = totalRevenue * 0.015; // Bond is pass-through

    // Write rows
    PL_CATEGORIES.forEach(cat => {
        const t = totals[cat.key];
        if (t.budget === 0 && t.revenue === 0) return; // Skip empty categories

        sheet.getCell(`A${currentRow}`).value = cat.label;

        // Revenue (Sell Price) - with formula reference
        const revenueCell = sheet.getCell(`B${currentRow}`);
        revenueCell.value = t.revenue;
        revenueCell.numFmt = '"$"#,##0.00';

        // Budget (Internal Cost)
        const budgetCell = sheet.getCell(`C${currentRow}`);
        budgetCell.value = t.budget;
        budgetCell.numFmt = '"$"#,##0.00';

        // Committed POs (placeholder for manual entry)
        const committedCell = sheet.getCell(`D${currentRow}`);
        committedCell.value = 0;
        committedCell.numFmt = '"$"#,##0.00';
        committedCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFCC' } }; // Editable highlight

        // Budget Remaining (Formula)
        const remainingCell = sheet.getCell(`E${currentRow}`);
        remainingCell.value = { formula: `C${currentRow}-D${currentRow}` };
        remainingCell.numFmt = '"$"#,##0.00';

        currentRow++;
    });

    // Totals Row
    currentRow++;
    sheet.getCell(`A${currentRow}`).value = 'TOTALS';
    sheet.getCell(`A${currentRow}`).font = { bold: true };

    const dataStartRow = HEADER_ROW + 1;
    const dataEndRow = currentRow - 2;

    ['B', 'C', 'D', 'E'].forEach(col => {
        const cell = sheet.getCell(`${col}${currentRow}`);
        cell.value = { formula: `SUM(${col}${dataStartRow}:${col}${dataEndRow})` };
        cell.font = { bold: true };
        cell.numFmt = '"$"#,##0.00';
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    });

    // Margin Summary
    currentRow += 2;
    sheet.getCell(`A${currentRow}`).value = 'GROSS MARGIN';
    sheet.getCell(`A${currentRow}`).font = { bold: true };
    sheet.getCell(`B${currentRow}`).value = { formula: `(B${currentRow - 2}-C${currentRow - 2})/B${currentRow - 2}` };
    sheet.getCell(`B${currentRow}`).numFmt = '0.0%';
    sheet.getCell(`B${currentRow}`).font = { bold: true, color: { argb: 'FF0A52EF' } };
}
