/**
 * Frankenstein Excel Normalizer — "Map Once, Remember Forever"
 *
 * Sits between raw Excel upload and the data model. Instead of hard-coded
 * heuristics that break on non-standard layouts (Moody Center, Huntington Bank),
 * this service:
 *   1. Fingerprints the workbook layout (sheet names + first 10 rows)
 *   2. Looks up a saved ImportProfile by fingerprint
 *   3. If found → extracts data using the saved column mapping
 *   4. If not found → returns raw preview data for the Mapping Wizard UI
 */

import * as xlsx from "xlsx";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { colLetterToIndex, colIndexToLetter } from "@/services/import/columnUtils";

// ============================================================================
// TYPES
// ============================================================================

export interface ColumnMapping {
    description?: string;   // Column letter for line item description/name
    quantity?: string;      // Column letter for quantity
    unitPrice?: string;     // Column letter for unit price
    totalCost?: string;     // Column letter for total cost
    sellingPrice?: string;  // Column letter for selling price
    margin?: string;        // Column letter for margin amount
    marginPct?: string;     // Column letter for margin %
    pitch?: string;         // Column letter for pixel pitch
    widthFt?: string;       // Column letter for width
    heightFt?: string;      // Column letter for height
    [key: string]: string | undefined; // Extensible for arbitrary fields
}

export interface NormalizeResult {
    status: "success" | "mapping_required";
    fingerprint: string;
    profileId?: string;
    profileName?: string;

    // Present when status === "success"
    extractedData?: ExtractedRow[];
    sheetName?: string;
    headerRow?: string[];

    // Present when status === "mapping_required"
    rawPreview?: RawSheetPreview[];
    fileName?: string;
}

export interface ExtractedRow {
    rowIndex: number;
    values: Record<string, string | number | null>;
}

export interface RawSheetPreview {
    sheetName: string;
    rows: (string | number | null)[][]; // First 50 rows
    totalRows: number;
}

export interface SaveProfileInput {
    name: string;
    fingerprint: string;
    targetSheet: string | null;
    headerRowIndex: number;
    dataStartRowIndex: number;
    columnMapping: ColumnMapping;
    dataEndStrategy: string;
    createdBy?: string;
}

// ============================================================================
// FINGERPRINTING
// ============================================================================

/**
 * Generate a layout fingerprint for a workbook.
 * Concatenates sheet names + content of first 10 rows of each sheet, then SHA-256 hashes.
 * This ensures structurally identical workbooks (same tabs, same header layout) match,
 * even if the actual data values differ.
 */
export function generateFingerprint(workbook: xlsx.WorkBook): string {
    const parts: string[] = [];

    // Include sorted sheet names (order-independent matching)
    const sheetNames = [...workbook.SheetNames].sort();
    parts.push(`SHEETS:${sheetNames.join("|")}`);

    // Include first 10 rows of each sheet (structure, not data)
    for (const name of sheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;

        const data: any[][] = xlsx.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,       // Get formatted strings, not raw values
            defval: "",
        });

        const previewRows = data.slice(0, 10);
        for (let r = 0; r < previewRows.length; r++) {
            const row = previewRows[r] || [];
            // Only include non-numeric cell content (headers, labels — not data values)
            const structural = row.map((cell: any) => {
                const s = String(cell ?? "").trim();
                // Keep if it looks like a header/label (not purely numeric)
                if (/^[\d,.$%()-]+$/.test(s)) return "NUM";
                if (s === "") return "";
                return s.toUpperCase();
            });
            parts.push(`${name}:R${r}:${structural.join("|")}`);
        }
    }

    return crypto.createHash("sha256").update(parts.join("\n")).digest("hex");
}

// ============================================================================
// CELL VALUE RESOLUTION (handles formulas + merged cells)
// ============================================================================

/**
 * Resolve a cell value, preferring computed result over formula text.
 * Handles merged cells by finding the master cell.
 */
function resolveCellValue(
    sheet: xlsx.WorkSheet,
    row: number,
    col: number,
): string | number | null {
    const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
    const cell = sheet[cellAddress];

    if (!cell) {
        // Check if this cell is part of a merge — find the master cell
        const merges = sheet["!merges"] || [];
        for (const merge of merges) {
            if (
                row >= merge.s.r && row <= merge.e.r &&
                col >= merge.s.c && col <= merge.e.c
            ) {
                const masterAddr = xlsx.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
                const masterCell = sheet[masterAddr];
                if (masterCell) {
                    // Prefer .v (computed value) over .w (formatted) over .f (formula)
                    return masterCell.v ?? masterCell.w ?? null;
                }
            }
        }
        return null;
    }

    // Prefer computed value (.v) — this handles "formulas only" files correctly
    // .v = raw value (number, string, boolean, Date)
    // .w = formatted text
    // .f = formula string (we never want this)
    return cell.v ?? cell.w ?? null;
}

// colLetterToIndex and colIndexToLetter imported from columnUtils.ts (client-safe)

// ============================================================================
// PROFILE-BASED EXTRACTION
// ============================================================================

/**
 * Extract data from a workbook using a saved ImportProfile.
 */
function extractWithProfile(
    workbook: xlsx.WorkBook,
    profile: {
        targetSheet: string | null;
        headerRowIndex: number;
        dataStartRowIndex: number;
        columnMapping: ColumnMapping;
        dataEndStrategy: string;
    },
): { rows: ExtractedRow[]; sheetName: string; headerRow: string[] } {
    // Resolve target sheet
    const sheetName = profile.targetSheet || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found in workbook. Available: ${workbook.SheetNames.join(", ")}`);
    }

    // Read header row
    const range = xlsx.utils.decode_range(sheet["!ref"] || "A1");
    const headerRow: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
        const val = resolveCellValue(sheet, profile.headerRowIndex, c);
        headerRow.push(String(val ?? ""));
    }

    // Parse data end strategy
    let endRow = range.e.r;
    const strategy = profile.dataEndStrategy;
    if (strategy.startsWith("row:")) {
        endRow = Math.min(parseInt(strategy.slice(4), 10) - 1, range.e.r);
    }
    // "blank_row" and "keyword:<text>" are handled during iteration

    const keywordEnd = strategy.startsWith("keyword:")
        ? strategy.slice(8).toLowerCase()
        : null;

    // Extract rows using column mapping
    const mapping = profile.columnMapping;
    const rows: ExtractedRow[] = [];

    for (let r = profile.dataStartRowIndex; r <= endRow; r++) {
        // Check blank row termination
        if (strategy === "blank_row") {
            let allEmpty = true;
            for (let c = range.s.c; c <= Math.min(range.s.c + 10, range.e.c); c++) {
                const v = resolveCellValue(sheet, r, c);
                if (v !== null && String(v).trim() !== "") {
                    allEmpty = false;
                    break;
                }
            }
            if (allEmpty) break;
        }

        // Check keyword termination
        if (keywordEnd) {
            for (let c = range.s.c; c <= Math.min(range.s.c + 5, range.e.c); c++) {
                const v = resolveCellValue(sheet, r, c);
                if (v !== null && String(v).toLowerCase().includes(keywordEnd)) {
                    return { rows, sheetName, headerRow };
                }
            }
        }

        // Extract mapped values
        const values: Record<string, string | number | null> = {};
        for (const [field, colLetter] of Object.entries(mapping)) {
            if (!colLetter) continue;
            const colIdx = colLetterToIndex(colLetter);
            values[field] = resolveCellValue(sheet, r, colIdx);
        }

        // Skip rows where all mapped values are empty
        const hasData = Object.values(values).some(
            (v) => v !== null && String(v).trim() !== "",
        );
        if (hasData) {
            rows.push({ rowIndex: r, values });
        }
    }

    return { rows, sheetName, headerRow };
}

// ============================================================================
// RAW PREVIEW (for Mapping Wizard)
// ============================================================================

/**
 * Generate raw preview data for all sheets (first 50 rows each).
 */
function generateRawPreview(workbook: xlsx.WorkBook): RawSheetPreview[] {
    const previews: RawSheetPreview[] = [];

    for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name];
        if (!sheet) continue;

        const range = sheet["!ref"] ? xlsx.utils.decode_range(sheet["!ref"]) : null;
        if (!range) continue;

        const totalRows = range.e.r - range.s.r + 1;
        const maxRows = Math.min(50, totalRows);
        const rows: (string | number | null)[][] = [];

        for (let r = range.s.r; r < range.s.r + maxRows; r++) {
            const row: (string | number | null)[] = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
                row.push(resolveCellValue(sheet, r, c));
            }
            rows.push(row);
        }

        previews.push({ sheetName: name, rows, totalRows });
    }

    return previews;
}

// ============================================================================
// MAIN ENTRY POINTS
// ============================================================================

/**
 * Normalize an Excel file: fingerprint → lookup → extract or request mapping.
 */
export async function normalizeExcel(
    buffer: Buffer,
    fileName?: string,
): Promise<NormalizeResult> {
    const workbook = xlsx.read(buffer, { type: "buffer", cellFormula: false });
    const fingerprint = generateFingerprint(workbook);

    // Look up existing profile
    const profile = await prisma.importProfile.findUnique({
        where: { fingerprint },
    });

    if (profile) {
        // Happy path: profile exists — extract using saved mapping
        const mapping = profile.columnMapping as ColumnMapping;
        const { rows, sheetName, headerRow } = extractWithProfile(workbook, {
            targetSheet: profile.targetSheet,
            headerRowIndex: profile.headerRowIndex,
            dataStartRowIndex: profile.dataStartRowIndex,
            columnMapping: mapping,
            dataEndStrategy: profile.dataEndStrategy,
        });

        // Bump usage stats
        await prisma.importProfile.update({
            where: { id: profile.id },
            data: {
                usageCount: { increment: 1 },
                lastUsedAt: new Date(),
            },
        });

        return {
            status: "success",
            fingerprint,
            profileId: profile.id,
            profileName: profile.name,
            extractedData: rows,
            sheetName,
            headerRow,
        };
    }

    // Frankenstein path: no profile — return raw preview for Mapping Wizard
    return {
        status: "mapping_required",
        fingerprint,
        rawPreview: generateRawPreview(workbook),
        fileName: fileName || "unknown.xlsx",
    };
}

/**
 * Save a new ImportProfile from the Mapping Wizard.
 * Then immediately extract data using the new profile.
 */
export async function saveProfileAndExtract(
    buffer: Buffer,
    input: SaveProfileInput,
): Promise<NormalizeResult> {
    // Save profile
    const profile = await prisma.importProfile.create({
        data: {
            name: input.name,
            fingerprint: input.fingerprint,
            targetSheet: input.targetSheet,
            headerRowIndex: input.headerRowIndex,
            dataStartRowIndex: input.dataStartRowIndex,
            columnMapping: input.columnMapping as any,
            dataEndStrategy: input.dataEndStrategy,
            createdBy: input.createdBy,
            usageCount: 1,
            lastUsedAt: new Date(),
        },
    });

    // Extract with the new profile
    const workbook = xlsx.read(buffer, { type: "buffer", cellFormula: false });
    const { rows, sheetName, headerRow } = extractWithProfile(workbook, {
        targetSheet: input.targetSheet,
        headerRowIndex: input.headerRowIndex,
        dataStartRowIndex: input.dataStartRowIndex,
        columnMapping: input.columnMapping,
        dataEndStrategy: input.dataEndStrategy,
    });

    return {
        status: "success",
        fingerprint: input.fingerprint,
        profileId: profile.id,
        profileName: profile.name,
        extractedData: rows,
        sheetName,
        headerRow,
    };
}
