/**
 * exportEstimatorExcel — Client-side Excel export with full formatting.
 *
 * Takes the ExcelPreviewData (exactly what the user sees) and produces
 * a formatted .xlsx using ExcelJS. What you see is what you get.
 */

import ExcelJS from "exceljs";
import type { ExcelPreviewData, SheetTab, SheetRow, SheetCell } from "./EstimatorBridge";

const ANC_BLUE = "0A52EF";
const HEADER_BG = "0A52EF";
const HEADER_FG = "FFFFFF";
const TOTAL_BG = "E8F5E9";
const HIGHLIGHT_BG = "FFF9C4";
const BORDER_COLOR = "D0D0D0";

const thinBorder: Partial<ExcelJS.Border> = { style: "thin", color: { argb: BORDER_COLOR } };
const allBorders: Partial<ExcelJS.Borders> = {
    top: thinBorder,
    bottom: thinBorder,
    left: thinBorder,
    right: thinBorder,
};

export async function exportEstimatorExcel(data: ExcelPreviewData): Promise<Blob> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "ANC Proposal Engine";
    workbook.created = new Date();

    for (const sheet of data.sheets) {
        const ws = workbook.addWorksheet(sheet.name, {
            properties: { tabColor: { argb: sheet.color.replace("#", "") } },
        });

        // Set column widths based on header names
        ws.columns = sheet.columns.map((col, i) => ({
            width: getColumnWidth(col, i, sheet),
        }));

        // Write rows
        for (let ri = 0; ri < sheet.rows.length; ri++) {
            const row = sheet.rows[ri];

            if (row.isSeparator) {
                const exRow = ws.addRow(Array(sheet.columns.length).fill(""));
                exRow.height = 8;
                continue;
            }

            // Handle spanned rows
            const firstCell = row.cells[0];
            if (firstCell?.span && firstCell.span > 1) {
                const exRow = ws.addRow([firstCell.value]);
                ws.mergeCells(exRow.number, 1, exRow.number, sheet.columns.length);
                const cell = exRow.getCell(1);
                applyCellStyle(cell, firstCell, row);
                continue;
            }

            // Regular row
            const values = sheet.columns.map((_, ci) => {
                const c = row.cells[ci];
                return c ? c.value : "";
            });
            const exRow = ws.addRow(values);

            // Style each cell
            for (let ci = 0; ci < sheet.columns.length; ci++) {
                const sc = row.cells[ci];
                const cell = exRow.getCell(ci + 1);
                if (sc) {
                    applyCellStyle(cell, sc, row);
                }
                cell.border = allBorders;
            }

            // Row-level styling
            if (row.isHeader) {
                exRow.height = 20;
                for (let ci = 1; ci <= sheet.columns.length; ci++) {
                    const cell = exRow.getCell(ci);
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: HEADER_BG },
                    };
                    cell.font = { ...cell.font, color: { argb: HEADER_FG }, bold: true, size: 10 };
                }
            }

            if (row.isTotal) {
                for (let ci = 1; ci <= sheet.columns.length; ci++) {
                    const cell = exRow.getCell(ci);
                    cell.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: TOTAL_BG.replace("#", "") },
                    };
                }
            }
        }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
}

function applyCellStyle(cell: ExcelJS.Cell, sc: SheetCell, row: SheetRow) {
    // Font
    cell.font = {
        name: "Calibri",
        size: 10,
        bold: sc.bold || sc.header || false,
        color: sc.header && !row.isHeader ? { argb: ANC_BLUE } : undefined,
    };

    // Alignment
    cell.alignment = {
        horizontal: sc.align || "left",
        vertical: "middle",
        wrapText: false,
    };

    // Number formatting
    if (sc.currency && typeof sc.value === "number") {
        cell.numFmt = "$#,##0.00";
    }
    if (sc.percent && typeof sc.value === "number") {
        cell.numFmt = "0.0%";
    }

    // Highlight
    if (sc.highlight) {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: HIGHLIGHT_BG.replace("#", "") },
        };
    }
}

function getColumnWidth(colName: string, _index: number, _sheet: SheetTab): number {
    const name = colName.toUpperCase();
    if (name === "CATEGORY" || name === "DISPLAY" || name === "DESCRIPTION") return 30;
    if (name.includes("PRICE") || name.includes("COST") || name.includes("TOTAL")) return 18;
    if (name === "QTY" || name === "UNIT" || name === "PITCH") return 10;
    if (name.includes("MARGIN")) return 12;
    return 16;
}
