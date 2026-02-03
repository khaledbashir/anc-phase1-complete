/**
 * Audit-Ready Excel Export Service (Ferrari Edition)
 * 
 * Generates a "Formulaic" audit report for Finance.
 * Senior estimators can change inputs in Excel and see recalcs instantly.
 * 
 * P0 REQUIREMENT: LIVE FORMULAS
 * - Selling Price uses: =Cost / (1 - MarginCell)
 * - Bond uses: =SellingPrice * BondRateCell
 * - Total uses: =SUM(SellingPrice, Bond, Tax)
 * - Yellow cell format for all user-input cells
 * 
 * Implementations:
 * - Morgantown B&O Tax (2%) triggers automatically for WVU projects
 * - Yellow highlighting for Margin %, Bond Rate, Tax Rate, Cost Inputs
 * - Master Truth compliance with live formulas linked to input cells
 */

import ExcelJS from 'exceljs';
import { ScreenInput, ScreenAudit } from '@/lib/estimator';

export interface AuditExcelOptions {
    proposalName?: string;
    clientName?: string;
    proposalDate?: string;
    status?: 'DRAFT' | 'FINAL';
    boTaxApplies?: boolean;
    // REQ-86: Structural Steel Inputs
    structuralTonnage?: number;
    reinforcingTonnage?: number;
    // For PDF/Excel total matching verification
    pdfTotal?: number;
    // REQ-126: Financial rate overrides (Master Truth compliance)
    bondRateOverride?: number;  // Default 0.015 (1.5%)
    taxRateOverride?: number;   // Default 0.095 (9.5%)
}

// ============================================================================
// HELPER: YELLOW CELL FORMATTING
// ============================================================================
 /**
 * Applies yellow background formatting to a cell (user-input indicator)
 * Usage for all input cells: Margin %, Bond Rate, Tax Rate, Cost Basis, etc.
 */
function formatAsInputCell(cell: ExcelJS.Cell): void {
    cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' } // Yellow (RGB 255, 255, 0)
    };
}

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

    // 1. Margin Analysis (The Master Truth)
    const marginSheet = workbook.addWorksheet('Margin Analysis', {
        properties: { tabColor: { argb: 'FF0A52EF' } } // ANC French Blue
    });
    buildMarginAnalysis(marginSheet, screens, options);

    // 2. LED Cost Sheet
    const ledSheet = workbook.addWorksheet('LED Cost Sheet', {
        properties: { tabColor: { argb: 'FFFFC107' } } // Amber
    });
    buildLEDCostSheet(ledSheet, screens);

    // 3. Install (Installation)
    const installSheet = workbook.addWorksheet('Install', {
        properties: { tabColor: { argb: 'FF28A745' } } // Green
    });
    buildInstallSheet(installSheet, screens);

    // 4. Project Management
    const pmSheet = workbook.addWorksheet('Project Management', {
        properties: { tabColor: { argb: 'FF17A2B8' } } // Cyan
    });
    buildPMSheet(pmSheet, screens);

    // 5. Electrical and Data
    const elecSheet = workbook.addWorksheet('Electrical and Data', {
        properties: { tabColor: { argb: 'FFFFC107' } } // Amber
    });
    buildElectricalSheet(elecSheet, screens);

    // 6. Professional Services
    const proSheet = workbook.addWorksheet('Professional Services', {
        properties: { tabColor: { argb: 'FF6C757D' } } // Grey
    });
    buildProfessionalServicesSheet(proSheet, screens);

    // 7. Control System/CMS
    const cmsSheet = workbook.addWorksheet('Control System CMS', {
        properties: { tabColor: { argb: 'FF6610F2' } } // Purple
    });
    buildControlSystemSheet(cmsSheet, screens);

    // 8. Shipping
    const shippingSheet = workbook.addWorksheet('Shipping', {
        properties: { tabColor: { argb: 'FFFD7E14' } } // Orange
    });
    buildShippingSheet(shippingSheet, screens);

    // 9. Alternates (Placeholder)
    const altSheet = workbook.addWorksheet('Alternates', {
        properties: { tabColor: { argb: 'FFDC3545' } } // Red
    });
    buildPlaceholderSheet(altSheet, "Alternates (Optional)", "Add alternate screen options here.");

    // 10. Content Creation (Placeholder)
    const contentSheet = workbook.addWorksheet('Content Creation', {
        properties: { tabColor: { argb: 'FFD63384' } } // Pink
    });
    buildPlaceholderSheet(contentSheet, "Content Creation", "Add content creation hours and rates here.");

    return workbook;
}

export async function generateAuditExcelBuffer(screens: any[], options?: AuditExcelOptions): Promise<Buffer> {
    const workbook = await generateAuditExcel(screens, options);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
}

// --- Sheet Builders ---

function buildMarginAnalysis(sheet: ExcelJS.Worksheet, screens: any[], options?: AuditExcelOptions) {
    // Header
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `ANC MARGIN ANALYSIS (MASTER TRUTH) - ${options?.proposalName || 'PROPOSAL'}`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A52EF' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:I2');
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
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { horizontal: 'center' };
        sheet.getColumn(h.col).width = h.width;
    });

    const sellPriceRows: number[] = [];

    screens.forEach(screen => {
        const audit = screen.internalAudit || screen._internalAudit || screen.audit;
        const b = audit?.breakdown || {};
        const margin = screen.desiredMargin || 0.25;

        // Screen Header
        sheet.getCell(`A${currentRow}`).value = screen.name || "Unnamed Screen";
        sheet.getCell(`A${currentRow}`).font = { bold: true };
        sheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEE2E6' } };
        currentRow++;

        // 1. HARDWARE
        const hwRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'Display Hardware';
        sheet.getCell(`B${currentRow}`).value = 'Area (SqFt)';
        const area = (audit?.areaSqFt || 0);
        sheet.getCell(`C${currentRow}`).value = area;
        sheet.getCell(`B${currentRow+1}`).value = 'Cost/SqFt';
        sheet.getCell(`C${currentRow+1}`).value = screen.costPerSqFt || 120;
        formatAsInputCell(sheet.getCell(`C${currentRow+1}`));

        sheet.getCell(`B${currentRow+2}`).value = 'Spare Parts (5%)';
        sheet.getCell(`C${currentRow+2}`).value = screen.includeSpareParts ? 'YES' : 'NO';
        formatAsInputCell(sheet.getCell(`C${currentRow+2}`));

        const costCell = sheet.getCell(`E${hwRow}`);
        costCell.value = {
            formula: `C${hwRow}*C${hwRow + 1}*(IF(C${hwRow + 2}="YES", 1.05, 1))`
        };
        costCell.numFmt = '"$"#,##0.00';
        costCell.font = { bold: true };

        currentRow += 3;

        // 2. SOFT COSTS (Aggregated)
        const softCostTotal = (b.install || 0) + (b.labor || 0) + (b.structure || 0) + (b.power || 0) + (b.shipping || 0) + (b.pm || 0) + (b.engineering || 0);
        sheet.getCell(`A${currentRow+2}`).value = 'Services & Install';
        sheet.getCell(`B${currentRow}`).value = 'Combined Estimate';
        sheet.getCell(`C${currentRow}`).value = softCostTotal;
        formatAsInputCell(sheet.getCell(`C${currentRow}`));
        sheet.getCell(`E${currentRow}`).value = { formula: `C${currentRow}` };
        sheet.getCell(`E${currentRow}`).numFmt = '"$"#,##0.00';
        const softRow = currentRow;
        currentRow++;

        // 3. MARGIN & SELL
        const sellRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'TOTAL SELL PRICE';
        sheet.getCell(`D${currentRow}`).value = '(Hardware + Services) / (1 - Margin)';
        
        // Total Cost Formula
        const totalCostRef = `(E${hwRow}+E${softRow})`;
        
        sheet.getCell(`F${currentRow}`).value = margin;
        sheet.getCell(`F${currentRow}`).numFmt = '0.0%';
        formatAsInputCell(sheet.getCell(`F${currentRow}`));
        
        // Divisor Model
        sheet.getCell(`G${currentRow}`).value = { formula: `${totalCostRef}/(1-F${currentRow})` };
        sheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';
        sheet.getCell(`G${currentRow}`).font = { bold: true };
        sellPriceRows.push(sellRow);

        currentRow += 2;
    });

    // TOTALS SECTION
    const totalStartRow = currentRow;
    sheet.getCell(`A${currentRow}`).value = 'PROJECT TOTALS';
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
    sheet.getCell(`A${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A52EF' } };
    sheet.getCell(`A${currentRow}`).font = { color: { argb: 'FFFFFFFF' }, bold: true };
    currentRow++;

    // Sum of Sell Prices
    const sellPriceRow = currentRow;
    sheet.getCell(`A${currentRow}`).value = 'TOTAL SELL PRICE';
    const sellSumFormula = sellPriceRows.length > 0 ? sellPriceRows.map(r => `G${r}`).join('+') : '0';
    sheet.getCell(`G${currentRow}`).value = { formula: sellSumFormula };
    sheet.getCell(`G${currentRow}`).numFmt = '"$"#,##0.00';
    sheet.getCell(`G${currentRow}`).font = { bold: true };
    currentRow++;

    // BOND
    const bondRow = currentRow;
    sheet.getCell(`A${currentRow}`).value = 'PERFORMANCE BOND (1.5%)';
    sheet.getCell(`H${currentRow}`).value = options?.bondRateOverride ?? 0.015;
    sheet.getCell(`H${currentRow}`).numFmt = '0.0%';
    formatAsInputCell(sheet.getCell(`H${currentRow}`));
    sheet.getCell(`I${currentRow}`).value = { formula: `G${sellPriceRow}*H${currentRow}` };
    sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';
    currentRow++;

    // B&O TAX (Morgantown/WVU only) - conditional row creation
    let boTaxRow: number | undefined = undefined;
    if (options?.boTaxApplies) {
        boTaxRow = currentRow;
        sheet.getCell(`A${currentRow}`).value = 'CITY B&O TAX (2%) - MORGANTOWN/WVU';
        sheet.getCell(`H${currentRow}`).value = 0.02;
        sheet.getCell(`H${currentRow}`).numFmt = '0.0%';
        formatAsInputCell(sheet.getCell(`H${currentRow}`));
        sheet.getCell(`I${currentRow}`).value = { formula: `(G${sellPriceRow}+I${bondRow})*H${boTaxRow}` };
        sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';
        currentRow++;
    }

    // SALES TAX
    const taxRow = currentRow;
    const effectiveTaxRate = options?.taxRateOverride ?? 0.095;
    sheet.getCell(`A${currentRow}`).value = `SALES TAX (${(effectiveTaxRate * 100).toFixed(1)}%)`;
    sheet.getCell(`H${currentRow}`).value = effectiveTaxRate;
    sheet.getCell(`H${currentRow}`).numFmt = '0.0%';
    formatAsInputCell(sheet.getCell(`H${currentRow}`));

    // Only include B&O Tax in Sales Tax formula if it applies
    if (options?.boTaxApplies) {
        sheet.getCell(`I${currentRow}`).value = { formula: `(G${sellPriceRow}+I${bondRow}+I${boTaxRow})*H${taxRow}` };
    } else {
        sheet.getCell(`I${currentRow}`).value = { formula: `(G${sellPriceRow}+I${bondRow})*H${taxRow}` };
    }
    sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';
    currentRow++;

    // GRAND TOTAL
    if (options?.boTaxApplies && boTaxRow) {
        sheet.getCell(`A${currentRow}`).value = 'FINAL CLIENT TOTAL';
        sheet.getCell(`I${currentRow}`).value = { formula: `G${sellPriceRow}+I${bondRow}+I${boTaxRow}+I${taxRow}` };
    } else {
        sheet.getCell(`A${currentRow}`).value = 'FINAL CLIENT TOTAL';
        sheet.getCell(`I${currentRow}`).value = { formula: `G${sellPriceRow}+I${bondRow}+I${taxRow}` };
    }
    sheet.getCell(`I${currentRow}`).font = { bold: true, size: 14 };
    sheet.getCell(`I${currentRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
    sheet.getCell(`I${currentRow}`).numFmt = '"$"#,##0.00';
}

function buildLEDCostSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'LED TECHNICAL SPECIFICATIONS');
    const headers = ['Display Name', 'Pixel Pitch (mm)', 'Width (ft)', 'Height (ft)', 'Pixels W', 'Pixels H', 'Brightness (nits)', 'Est. Hardware Cost'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = s.pixelPitch || s.pitchMm;
        sheet.getCell(`C${currentRow}`).value = s.widthFt || s.width;
        sheet.getCell(`D${currentRow}`).value = s.heightFt || s.height;
        sheet.getCell(`E${currentRow}`).value = audit?.pixelResolution || 0; // Simplified
        sheet.getCell(`F${currentRow}`).value = 0; // Need calculation if missing
        sheet.getCell(`G${currentRow}`).value = s.brightness || 0;
        sheet.getCell(`H${currentRow}`).value = b.hardware || 0;
        sheet.getCell(`H${currentRow}`).numFmt = '"$"#,##0.00';
        currentRow++;
    });
    
    // Auto-width
    sheet.columns.forEach(col => { col.width = 15; });
    sheet.getColumn(1).width = 30;
}

function buildInstallSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'INSTALLATION & LABOR COSTS');
    const headers = ['Display Name', 'Structural', 'Install', 'Labor', 'Demolition', 'Total Install'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = b.structure || 0;
        sheet.getCell(`C${currentRow}`).value = b.install || 0;
        sheet.getCell(`D${currentRow}`).value = b.labor || 0;
        sheet.getCell(`E${currentRow}`).value = b.demolition || 0;
        const total = (b.structure||0) + (b.install||0) + (b.labor||0) + (b.demolition||0);
        sheet.getCell(`F${currentRow}`).value = total;
        
        ['B','C','D','E','F'].forEach(c => {
            sheet.getCell(`${c}${currentRow}`).numFmt = '"$"#,##0.00';
        });
        currentRow++;
    });
    sheet.getColumn(1).width = 30;
}

function buildPMSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'PROJECT MANAGEMENT');
    const headers = ['Display Name', 'PM Cost', 'General Conditions', 'Travel'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = b.pm || 0;
        sheet.getCell(`C${currentRow}`).value = b.generalConditions || 0;
        sheet.getCell(`D${currentRow}`).value = b.travel || 0;
        
        ['B','C','D'].forEach(c => {
            sheet.getCell(`${c}${currentRow}`).numFmt = '"$"#,##0.00';
        });
        currentRow++;
    });
    sheet.getColumn(1).width = 30;
}

function buildElectricalSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'ELECTRICAL & DATA');
    const headers = ['Display Name', 'Power Requirements', 'Data/Signal', 'Total Cost'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = b.power || 0;
        sheet.getCell(`C${currentRow}`).value = 0; // Placeholder
        sheet.getCell(`D${currentRow}`).value = b.power || 0;
        
        ['B','C','D'].forEach(c => {
            sheet.getCell(`${c}${currentRow}`).numFmt = '"$"#,##0.00';
        });
        currentRow++;
    });
    sheet.getColumn(1).width = 30;
}

function buildProfessionalServicesSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'PROFESSIONAL SERVICES');
    const headers = ['Display Name', 'Engineering', 'Permits', 'Submittals', 'Total'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = b.engineering || 0;
        sheet.getCell(`C${currentRow}`).value = b.permits || 0;
        sheet.getCell(`D${currentRow}`).value = b.submittals || 0;
        const total = (b.engineering||0) + (b.permits||0) + (b.submittals||0);
        sheet.getCell(`E${currentRow}`).value = total;
        
        ['B','C','D','E'].forEach(c => {
            sheet.getCell(`${c}${currentRow}`).numFmt = '"$"#,##0.00';
        });
        currentRow++;
    });
    sheet.getColumn(1).width = 30;
}

function buildShippingSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'SHIPPING & LOGISTICS');
    const headers = ['Display Name', 'Shipping Cost'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = b.shipping || 0;
        sheet.getCell(`B${currentRow}`).numFmt = '"$"#,##0.00';
        currentRow++;
    });
    sheet.getColumn(1).width = 30;
}

function buildControlSystemSheet(sheet: ExcelJS.Worksheet, screens: any[]) {
    setupSheetHeader(sheet, 'CONTROL SYSTEM / CMS');
    const headers = ['Display Name', 'CMS / Control Cost'];
    setupTableHeaders(sheet, 3, headers);

    let currentRow = 4;
    screens.forEach(s => {
        const audit = s.internalAudit || s._internalAudit || s.audit;
        const b = audit?.breakdown || {};
        
        sheet.getCell(`A${currentRow}`).value = s.name;
        sheet.getCell(`B${currentRow}`).value = b.cms || 0;
        sheet.getCell(`B${currentRow}`).numFmt = '"$"#,##0.00';
        currentRow++;
    });
    sheet.getColumn(1).width = 30;
}

function buildPlaceholderSheet(sheet: ExcelJS.Worksheet, title: string, instruction: string) {
    setupSheetHeader(sheet, title);
    sheet.getCell('A3').value = instruction;
    sheet.getCell('A3').font = { italic: true };
}

// Helpers
function setupSheetHeader(sheet: ExcelJS.Worksheet, title: string) {
    sheet.mergeCells('A1:F1');
    const cell = sheet.getCell('A1');
    cell.value = title;
    cell.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
    cell.alignment = { horizontal: 'center' };
}

function setupTableHeaders(sheet: ExcelJS.Worksheet, row: number, headers: string[]) {
    headers.forEach((h, i) => {
        const cell = sheet.getCell(row, i + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDEE2E6' } };
        cell.alignment = { horizontal: 'center' };
    });
}
