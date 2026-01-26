/**
 * Formulaic Excel Export Service
 * 
 * Generates Excel files with LIVE FORMULAS (not static values)
 * so senior estimators can audit and modify calculations.
 * 
 * Key Features:
 * - All calculated cells use Excel formulas
 * - Named ranges for clarity
 * - Color-coded sections (cost vs. margin vs. totals)
 * - Locked header rows for consistency
 */

import ExcelJS from 'exceljs';
import { ScreenInput, calculatePerScreenAudit, ScreenAudit } from '@/lib/estimator';

// Column mapping for formula references
const COLUMNS = {
    SCREEN_NAME: 'A',
    PRODUCT_TYPE: 'B',
    WIDTH_FT: 'C',
    HEIGHT_FT: 'D',
    QUANTITY: 'E',
    PITCH_MM: 'F',
    AREA_SQFT: 'G',        // Formula: =C*D*E
    COST_PER_SQFT: 'H',
    HARDWARE: 'I',          // Formula: =G*H
    STRUCTURE: 'J',         // Formula: =I*structure_pct
    INSTALL: 'K',
    LABOR: 'L',             // Formula: =I*0.15
    POWER: 'M',
    SHIPPING: 'N',          // Formula: =G*0.14
    PM: 'O',                // Formula: =G*0.5
    GEN_CONDITIONS: 'P',    // Formula: =I*0.03
    TRAVEL: 'Q',            // Formula: =I*0.01
    SUBMITTALS: 'R',        // Formula: =I*0.01
    ENGINEERING: 'S',       // Formula: =I*0.02
    PERMITS: 'T',
    CMS: 'U',               // Formula: =I*0.02
    TOTAL_COST: 'V',        // Formula: =SUM(I:U)
    MARGIN_PCT: 'W',
    SELL_PRICE: 'X',        // Formula: =V/(1-W)
    ANC_MARGIN: 'Y',        // Formula: =X-V
    BOND_COST: 'Z',         // Formula: =X*0.015
    FINAL_TOTAL: 'AA',      // Formula: =X+Z
    SELLING_SQFT: 'AB',     // Formula: =AA/G
};

export interface FormulaicExcelOptions {
    proposalName?: string;
    clientName?: string;
    proposalDate?: string;
    status?: 'DRAFT' | 'FINAL';
    internalAuditData?: ScreenAudit[];
}

/**
 * Generate Excel workbook with live formulas and Named Ranges
 */
export async function generateFormulaicExcel(
    screens: ScreenInput[],
    options?: FormulaicExcelOptions
): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ANC Proposal Engine';
    workbook.created = new Date();

    // Create main audit sheet
    const auditSheet = workbook.addWorksheet('Internal Audit', {
        properties: { tabColor: { argb: 'FF2E86AB' } }
    });

    // Create summary sheet
    const summarySheet = workbook.addWorksheet('Summary', {
        properties: { tabColor: { argb: 'FF28A745' } }
    });

    // Build the audit sheet with formulas
    buildAuditSheet(auditSheet, screens, options);

    // Build summary sheet with totals
    buildSummarySheet(summarySheet, screens.length, options);

    // Register Named Ranges for human-readable formulas with project-unique suffix
    const proposalId = options?.proposalName || 'Prop';
    const sanitizedId = proposalId.replace(/[^a-zA-Z0-9]/g, '_');
    registerNamedRanges(workbook, screens.length, sanitizedId);

    return workbook;
}

/**
 * Register Named Ranges so formulas are human-readable
 * e.g., "Hardware_Screen1_PRJ001" instead of "I5"
 */
function registerNamedRanges(workbook: ExcelJS.Workbook, screenCount: number, projectSuffix: string) {
    const DATA_START_ROW = 5;
    const totalsRow = DATA_START_ROW + screenCount;

    // Define named range mappings for each screen
    for (let i = 0; i < screenCount; i++) {
        const row = DATA_START_ROW + i;
        const screenNum = i + 1;

        // Input fields
        workbook.definedNames.add(`'Internal Audit'!$C$${row}`, `Width_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$D$${row}`, `Height_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$E$${row}`, `Qty_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$H$${row}`, `CostPerSqFt_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$W$${row}`, `Margin_Screen${screenNum}_${projectSuffix}`);

        // Calculated fields
        workbook.definedNames.add(`'Internal Audit'!$G$${row}`, `Area_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$I$${row}`, `Hardware_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$J$${row}`, `Structure_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$V$${row}`, `TotalCost_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$X$${row}`, `SellPrice_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$Z$${row}`, `Bond_Screen${screenNum}_${projectSuffix}`);
        workbook.definedNames.add(`'Internal Audit'!$AA$${row}`, `FinalTotal_Screen${screenNum}_${projectSuffix}`);
    }

    // Totals named ranges
    workbook.definedNames.add(`'Internal Audit'!$I$${totalsRow}`, `Hardware_Total_${projectSuffix}`);
    workbook.definedNames.add(`'Internal Audit'!$V$${totalsRow}`, `TotalCost_All_${projectSuffix}`);
    workbook.definedNames.add(`'Internal Audit'!$X$${totalsRow}`, `SellPrice_Total_${projectSuffix}`);
    workbook.definedNames.add(`'Internal Audit'!$Z$${totalsRow}`, `Bond_Total_${projectSuffix}`);
    workbook.definedNames.add(`'Internal Audit'!$AA$${totalsRow}`, `GrandTotal_${projectSuffix}`);
    workbook.definedNames.add(`'Internal Audit'!$AB$${totalsRow}`, `SellingPerSqFt_${projectSuffix}`);
}


/**
 * Build the main audit sheet with all formulas
 */
function buildAuditSheet(
    sheet: ExcelJS.Worksheet,
    screens: ScreenInput[],
    options?: FormulaicExcelOptions
) {
    const STATUS = options?.status || 'DRAFT';
    const HEADER_ROW = 4; // Data starts at row 5
    const DATA_START_ROW = 5;

    // ========== HEADER SECTION ==========

    // Title row
    sheet.mergeCells('A1:AB1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = options?.proposalName
        ? `ANC INTERNAL AUDIT - ${options.proposalName}`
        : 'ANC INTERNAL AUDIT';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E86AB' } };
    titleCell.alignment = { horizontal: 'center' };

    // Status/info row
    sheet.mergeCells('A2:AB2');
    const statusCell = sheet.getCell('A2');
    statusCell.value = `Status: ${STATUS} | Client: ${options?.clientName || 'N/A'} | Date: ${options?.proposalDate || new Date().toLocaleDateString()}`;
    statusCell.font = { size: 11, italic: true };
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS === 'DRAFT' ? 'FFFFF3CD' : 'FFD4EDDA' } };

    // Formula explanation row
    sheet.mergeCells('A3:AB3');
    const formulaNote = sheet.getCell('A3');
    formulaNote.value = '⚠️ This sheet contains LIVE FORMULAS. Modify input values (shaded green) to recalculate.';
    formulaNote.font = { size: 10, italic: true, color: { argb: 'FF856404' } };

    // ========== COLUMN HEADERS ==========

    const headers = [
        { col: 'A', label: 'Screen Name', width: 25 },
        { col: 'B', label: 'Product Type', width: 15 },
        { col: 'C', label: 'Width (ft)', width: 12, input: true },
        { col: 'D', label: 'Height (ft)', width: 12, input: true },
        { col: 'E', label: 'Qty', width: 8, input: true },
        { col: 'F', label: 'Pitch (mm)', width: 12, input: true },
        { col: 'G', label: 'Area (sqft)', width: 12, formula: true },
        { col: 'H', label: '$/SqFt', width: 10, input: true },
        { col: 'I', label: 'Hardware', width: 12, formula: true },
        { col: 'J', label: 'Structure', width: 12, formula: true },
        { col: 'K', label: 'Install', width: 12, input: true },
        { col: 'L', label: 'Labor', width: 12, formula: true },
        { col: 'M', label: 'Power', width: 12, formula: true },
        { col: 'N', label: 'Shipping', width: 12, formula: true },
        { col: 'O', label: 'PM', width: 12, formula: true },
        { col: 'P', label: 'Gen Cond', width: 12, formula: true },
        { col: 'Q', label: 'Travel', width: 10, formula: true },
        { col: 'R', label: 'Submittals', width: 12, formula: true },
        { col: 'S', label: 'Engineering', width: 12, formula: true },
        { col: 'T', label: 'Permits', width: 10, input: true },
        { col: 'U', label: 'CMS', width: 10, formula: true },
        { col: 'V', label: 'TOTAL COST', width: 14, formula: true, total: true },
        { col: 'W', label: 'Margin %', width: 10, input: true },
        { col: 'X', label: 'SELL PRICE', width: 14, formula: true, total: true },
        { col: 'Y', label: 'ANC Margin', width: 12, formula: true },
        { col: 'Z', label: 'Bond (1.5%)', width: 12, formula: true },
        { col: 'AA', label: 'FINAL TOTAL', width: 14, formula: true, total: true },
        { col: 'AB', label: '$/SqFt Sell', width: 12, formula: true },
    ];

    headers.forEach(header => {
        const cell = sheet.getCell(`${header.col}${HEADER_ROW}`);
        cell.value = header.label;
        cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: header.total ? 'FF1A5276' : header.input ? 'FF28A745' : 'FF5DADE2' }
        };
        cell.alignment = { horizontal: 'center', wrapText: true };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        sheet.getColumn(header.col).width = header.width;
    });

    // ========== DATA ROWS WITH FORMULAS ==========

    screens.forEach((screen, idx) => {
        const row = DATA_START_ROW + idx;
        const serviceType = screen.serviceType || 'Front/Rear';
        const structurePct = serviceType.toLowerCase() === 'top' ? 0.10 : 0.20;
        const formFactor = screen.formFactor || 'Straight';
        const isCurved = formFactor.toLowerCase() === 'curved';
        const laborMult = isCurved ? 1.15 : 1.0;
        const structureMult = isCurved ? 1.25 : 1.0;

        // Input values (green background - editable)
        setCellValue(sheet, `A${row}`, screen.name, 'input');
        setCellValue(sheet, `B${row}`, screen.productType || '', 'input');
        setCellValue(sheet, `C${row}`, screen.widthFt, 'input');
        setCellValue(sheet, `D${row}`, screen.heightFt, 'input');
        setCellValue(sheet, `E${row}`, screen.quantity || 1, 'input');
        setCellValue(sheet, `F${row}`, screen.pitchMm || 10, 'input');
        setCellValue(sheet, `H${row}`, screen.costPerSqFt || 120, 'input');
        setCellValue(sheet, `K${row}`, 5000 * laborMult, 'input'); // Install flat fee
        setCellValue(sheet, `T${row}`, 500, 'input'); // Permits fixed
        setCellValue(sheet, `W${row}`, screen.desiredMargin || 0.25, 'input');

        // Formula cells (blue background - calculated)
        // Area = Width * Height * Qty
        setCellFormula(sheet, `G${row}`, `=C${row}*D${row}*E${row}`);

        // Hardware = Area * CostPerSqFt
        setCellFormula(sheet, `I${row}`, `=G${row}*H${row}`);

        // Structure = Hardware * structure_pct * curved_multiplier
        setCellFormula(sheet, `J${row}`, `=I${row}*${structurePct * structureMult}`);

        // Labor = Hardware * 0.15 * curved_multiplier
        setCellFormula(sheet, `L${row}`, `=I${row}*${0.15 * laborMult}`);

        // Power = Hardware * 0.15 (+ surcharge logic can be added)
        setCellFormula(sheet, `M${row}`, `=I${row}*0.15`);

        // Shipping = Area * 0.14
        setCellFormula(sheet, `N${row}`, `=G${row}*0.14`);

        // PM = Area * 0.5
        setCellFormula(sheet, `O${row}`, `=G${row}*0.5`);

        // General Conditions = Hardware * 0.03
        setCellFormula(sheet, `P${row}`, `=I${row}*0.03`);

        // Travel = Hardware * 0.01
        setCellFormula(sheet, `Q${row}`, `=I${row}*0.01`);

        // Submittals = Hardware * 0.01
        setCellFormula(sheet, `R${row}`, `=I${row}*0.01`);

        // Engineering = Hardware * 0.02
        setCellFormula(sheet, `S${row}`, `=I${row}*0.02`);

        // CMS = Hardware * 0.02
        setCellFormula(sheet, `U${row}`, `=I${row}*0.02`);

        // TOTAL COST = SUM(Hardware:CMS)
        setCellFormula(sheet, `V${row}`, `=SUM(I${row}:U${row})`, 'total');

        // SELL PRICE = Total Cost / (1 - Margin%)
        setCellFormula(sheet, `X${row}`, `=V${row}/(1-W${row})`, 'total');

        // ANC Margin = Sell Price - Total Cost
        setCellFormula(sheet, `Y${row}`, `=X${row}-V${row}`);

        // Bond = Sell Price * 1.5%
        setCellFormula(sheet, `Z${row}`, `=X${row}*0.015`);

        // FINAL TOTAL = Sell Price + Bond
        setCellFormula(sheet, `AA${row}`, `=X${row}+Z${row}`, 'total');

        // Selling $/SqFt = Final Total / Area
        setCellFormula(sheet, `AB${row}`, `=IF(G${row}>0,AA${row}/G${row},0)`);
    });

    // ========== TOTALS ROW ==========

    const totalsRow = DATA_START_ROW + screens.length;
    const lastDataRow = DATA_START_ROW + screens.length - 1;

    sheet.getCell(`A${totalsRow}`).value = 'TOTALS';
    sheet.getCell(`A${totalsRow}`).font = { bold: true, size: 12 };
    sheet.getCell(`A${totalsRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A5276' } };
    sheet.getCell(`A${totalsRow}`).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Sum formulas for totals
    const sumColumns = ['G', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'X', 'Y', 'Z', 'AA'];
    sumColumns.forEach(col => {
        setCellFormula(sheet, `${col}${totalsRow}`, `=SUM(${col}${DATA_START_ROW}:${col}${lastDataRow})`, 'total');
    });

    // Weighted average for $/SqFt
    setCellFormula(sheet, `AB${totalsRow}`, `=IF(G${totalsRow}>0,AA${totalsRow}/G${totalsRow},0)`, 'total');

    // Freeze header rows
    sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }];
}

/**
 * Build summary sheet with high-level totals
 */
function buildSummarySheet(
    sheet: ExcelJS.Worksheet,
    screenCount: number,
    options?: FormulaicExcelOptions
) {
    const DATA_START_ROW = 5;
    const totalsRow = DATA_START_ROW + screenCount;

    sheet.mergeCells('A1:D1');
    sheet.getCell('A1').value = 'PROPOSAL SUMMARY';
    sheet.getCell('A1').font = { size: 16, bold: true };
    sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF28A745' } };
    sheet.getCell('A1').font = { color: { argb: 'FFFFFFFF' } };

    const summaryData = [
        { label: 'Total Hardware Cost', ref: `='Internal Audit'!I${totalsRow}` },
        { label: 'Total Structure Cost', ref: `='Internal Audit'!J${totalsRow}` },
        { label: 'Total Install Cost', ref: `='Internal Audit'!K${totalsRow}` },
        { label: 'Total Labor Cost', ref: `='Internal Audit'!L${totalsRow}` },
        { label: 'Total Other Costs', ref: `=SUM('Internal Audit'!M${totalsRow}:U${totalsRow})` },
        { label: 'SUBTOTAL (All Costs)', ref: `='Internal Audit'!V${totalsRow}` },
        { label: 'ANC Margin', ref: `='Internal Audit'!Y${totalsRow}` },
        { label: 'Sell Price (pre-bond)', ref: `='Internal Audit'!X${totalsRow}` },
        { label: 'Bond Cost (1.5%)', ref: `='Internal Audit'!Z${totalsRow}` },
        { label: 'GRAND TOTAL', ref: `='Internal Audit'!AA${totalsRow}` },
        { label: 'Selling $/SqFt', ref: `='Internal Audit'!AB${totalsRow}` },
    ];

    summaryData.forEach((item, idx) => {
        const row = 3 + idx;
        sheet.getCell(`A${row}`).value = item.label;
        sheet.getCell(`A${row}`).font = { bold: item.label.includes('TOTAL') };
        sheet.getCell(`B${row}`).value = { formula: item.ref };
        sheet.getCell(`B${row}`).numFmt = '"$"#,##0.00';
        if (item.label.includes('TOTAL')) {
            sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
            sheet.getCell(`B${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } };
        }
    });

    sheet.getColumn('A').width = 25;
    sheet.getColumn('B').width = 18;
}

/**
 * Helper to set cell value with formatting
 */
function setCellValue(
    sheet: ExcelJS.Worksheet,
    ref: string,
    value: string | number,
    type: 'input' | 'formula' | 'total' = 'input'
) {
    const cell = sheet.getCell(ref);
    cell.value = value;

    if (type === 'input') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD4EDDA' } }; // Light green
    }

    if (typeof value === 'number') {
        cell.numFmt = (ref.includes('W')) ? '0%' : '"$"#,##0.00';
    }

    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
}

/**
 * Helper to set cell formula with formatting
 */
function setCellFormula(
    sheet: ExcelJS.Worksheet,
    ref: string,
    formula: string,
    type: 'formula' | 'total' = 'formula'
) {
    const cell = sheet.getCell(ref);
    cell.value = { formula };

    if (type === 'total') {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEDF3' } }; // Light blue
        cell.font = { bold: true };
    } else {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F8FF' } }; // Very light blue
    }

    cell.numFmt = '"$"#,##0.00';
    cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
    };
}

/**
 * Generate Excel buffer for download
 */
export async function generateFormulaicExcelBuffer(
    screens: ScreenInput[],
    options?: FormulaicExcelOptions
): Promise<Buffer> {
    const workbook = await generateFormulaicExcel(screens, options);
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
}
