/**
 * Audit-Ready Excel Export Service
 * 
 * Generates a "Values Only" audit report for Finance.
 * Shows every input and calculation step-by-step for 100% transparency.
 */

import ExcelJS from 'exceljs';
import { ScreenInput, ScreenAudit } from '@/lib/estimator';

export interface AuditExcelOptions {
    proposalName?: string;
    clientName?: string;
    proposalDate?: string;
    status?: 'DRAFT' | 'FINAL';
    internalAuditData?: ScreenAudit[];
}

/**
 * Generate Audit-Ready Excel Workbook (Values Only)
 */
export async function generateAuditExcel(
    screens: any[], // Any array of screens with their calculated audit attached
    options?: AuditExcelOptions
): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ANC Intelligence Core';
    workbook.created = new Date();

    const auditSheet = workbook.addWorksheet('Finance Audit Report', {
        properties: { tabColor: { argb: 'FF1A5276' } }
    });

    const summarySheet = workbook.addWorksheet('Proposed Summary', {
        properties: { tabColor: { argb: 'FF28A745' } }
    });

    // Build Audit Sheet (The "Why" behind the price)
    buildAuditReport(auditSheet, screens, options);

    // Build Summary Sheet (The "What")
    buildSummarySheet(summarySheet, screens, options);

    return workbook;
}

function buildAuditReport(sheet: ExcelJS.Worksheet, screens: any[], options?: AuditExcelOptions) {
    const HEADER_ROW = 4;
    let currentRow = 5;

    // Header styling
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `FINANCE AUDIT REPORT - ${options?.proposalName || 'ANC Proposal'}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Status: ${options?.status || 'DRAFT'} | Client: ${options?.clientName || 'N/A'} | Exported: ${new Date().toLocaleDateString()}`;
    sheet.getCell('A2').font = { italic: true };

    // Column Headers
    const headers = [
        { col: 'A', label: 'Screen/Item', width: 40 },
        { col: 'B', label: 'Input Variable', width: 30 },
        { col: 'C', label: 'Value', width: 20 },
        { col: 'D', label: 'Calculation Logic', width: 50 },
        { col: 'E', label: 'Result', width: 20, total: true },
    ];

    headers.forEach(h => {
        const cell = sheet.getCell(`${h.col}${HEADER_ROW}`);
        cell.value = h.label;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: h.total ? 'FF1B4F72' : 'FF2E86AB' } };
        cell.alignment = { horizontal: 'center' };
        sheet.getColumn(h.col).width = h.width;
    });

    // Data Sections per Screen
    screens.forEach((screen, idx) => {
        const audit = screen.internalAudit || screen._internalAudit || screen.audit; // Handle different mapping states
        const b = audit?.breakdown || {};

        // Section Divider
        sheet.mergeCells(`A${currentRow}:E${currentRow}`);
        const div = sheet.getCell(`A${currentRow}`);
        div.value = `SECTION ${idx + 1}: ${screen.name || 'Unnamed Screen'}`;
        div.font = { bold: true };
        div.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } };
        currentRow++;

        const rows = [
            { item: 'Display System', variable: 'Area', value: `${audit?.areaSqFt} sqft`, logic: 'Width * Height * Qty', result: '' },
            { item: 'Hardware Cost', variable: 'Price/SqFt', value: `$${screen.costPerSqFt}`, logic: 'Area * Price/SqFt', result: b.hardware },
            { item: 'Structure', variable: 'Structure %', value: `${((b.structure / (b.hardware || 1)) * 100).toFixed(0)}%`, logic: 'Hardware * Structure Pct', result: b.structure },
            { item: 'Labor & Install', variable: 'Labor Factor', value: '15%', logic: 'Hardware * 15%', result: (b.labor || 0) + (b.install || 0) },
            { item: 'Shipping', variable: 'Shipping Rate', value: '$0.14/sqft', logic: 'Area * 0.14', result: b.shipping },
            { item: 'Direct Costs', variable: 'Subtotal', value: '-', logic: 'SUM(Hardware:CMS)', result: b.totalCost },
            { item: 'ANC Margin', variable: 'Margin Pct', value: `${((b.ancMargin / (b.sellPrice || 1)) * 100).toFixed(0)}%`, logic: 'SellPrice - TotalCost', result: b.ancMargin },
            { item: 'Sell Price', variable: 'Pre-Bond Total', value: '-', logic: 'Cost / (1 - Margin)', result: b.sellPrice },
            { item: 'Bond Cost', variable: 'Bond Rate', value: '1.5%', logic: 'Sell Price * 0.015', result: b.bondCost },
            { item: 'FINAL CLIENT TOTAL', variable: 'Grand Total', value: '-', logic: 'Sell Price + Bond', result: b.finalClientTotal, isGrand: true },
        ];

        rows.forEach(r => {
            sheet.getCell(`A${currentRow}`).value = r.item;
            sheet.getCell(`B${currentRow}`).value = r.variable;
            sheet.getCell(`C${currentRow}`).value = r.value;
            sheet.getCell(`D${currentRow}`).value = r.logic;

            const resCell = sheet.getCell(`E${currentRow}`);
            resCell.value = r.result;
            if (typeof r.result === 'number') {
                resCell.numFmt = '"$"#,##0.00';
            }
            if (r.isGrand) {
                resCell.font = { bold: true };
                resCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
            }
            currentRow++;
        });

        currentRow++; // Space between screens
    });
}

function buildSummarySheet(sheet: ExcelJS.Worksheet, screens: any[], options?: AuditExcelOptions) {
    sheet.mergeCells('A1:C1');
    sheet.getCell('A1').value = 'ANC PROPOSAL SUMMARY';
    sheet.getCell('A1').font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    let totals = { hardware: 0, install: 0, margin: 0, grand: 0 };
    screens.forEach(s => {
        const b = (s.internalAudit || s._internalAudit || s.audit)?.breakdown || {};
        totals.hardware += b.hardware || 0;
        totals.install += (b.install || 0) + (b.labor || 0) + (b.structure || 0);
        totals.margin += b.ancMargin || 0;
        totals.grand += b.finalClientTotal || 0;
    });

    const summaryRows = [
        { label: 'Total Hardware', value: totals.hardware },
        { label: 'Total Install/Structure/Labor', value: totals.install },
        { label: 'Total ANC Margin', value: totals.margin },
        { label: 'GRAND TOTAL', value: totals.grand, isGrand: true },
    ];

    summaryRows.forEach((r, idx) => {
        sheet.getCell(`A${idx + 3}`).value = r.label;
        const vCell = sheet.getCell(`B${idx + 3}`);
        vCell.value = r.value;
        vCell.numFmt = '"$"#,##0.00';
        if (r.isGrand) {
            sheet.getCell(`A${idx + 3}`).font = { bold: true };
            vCell.font = { bold: true };
        }
    });

    sheet.getColumn('A').width = 30;
    sheet.getColumn('B').width = 20;
}

export async function generateAuditExcelBuffer(screens: any[], options?: AuditExcelOptions): Promise<Buffer> {
    const workbook = await generateAuditExcel(screens, options);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
}
