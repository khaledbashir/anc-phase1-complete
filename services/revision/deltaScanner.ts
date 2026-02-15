/**
 * Revision Radar — Delta Scanner
 *
 * Compares two versions of a cost analysis Excel (original + addendum/revised).
 * Parses both through the same column detection logic, then diffs section-by-section.
 * Returns per-section and per-row changes with dollar impact.
 */

import { findMarginAnalysisSheet } from "@/lib/sheetDetection";

// ============================================================================
// TYPES
// ============================================================================

export interface DeltaRow {
  label: string;
  oldValue: number;
  newValue: number;
  delta: number;
  /** Percentage change: (new - old) / old * 100 */
  pctChange: number | null;
  changeType: "added" | "removed" | "changed" | "unchanged";
}

export interface DeltaSection {
  sectionName: string;
  oldTotal: number;
  newTotal: number;
  delta: number;
  pctChange: number | null;
  rows: DeltaRow[];
  changeType: "added" | "removed" | "changed" | "unchanged";
}

export interface DeltaResult {
  originalName: string;
  revisedName: string;
  sections: DeltaSection[];
  /** Grand total delta */
  oldGrandTotal: number;
  newGrandTotal: number;
  grandTotalDelta: number;
  grandTotalPctChange: number | null;
  /** Summary counts */
  totalSections: number;
  changedSections: number;
  addedSections: number;
  removedSections: number;
  totalRowChanges: number;
  /** Timestamp */
  comparedAt: string;
}

/** Parsed section from a single workbook */
interface ParsedSection {
  name: string;
  rows: { label: string; value: number }[];
  total: number;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseNumber(val: any): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/[$,\s]/g, "").replace(/[()]/g, (m) => (m === "(" ? "-" : ""));
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

function normalizeLabel(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function pctChange(oldVal: number, newVal: number): number | null {
  if (oldVal === 0) return newVal === 0 ? null : null;
  return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
}

/**
 * Find the "selling price" or "price" column in header row.
 * Returns the column index for the value we compare.
 */
function findValueColumn(headerRow: any[]): number {
  const patterns = [
    /sell/i, /selling\s*price/i, /price/i, /amount/i, /total/i, /bid/i,
  ];
  for (const pat of patterns) {
    for (let c = headerRow.length - 1; c >= 0; c--) {
      const cell = String(headerRow[c] ?? "").trim();
      if (cell && pat.test(cell)) return c;
    }
  }
  // Fallback: rightmost numeric column candidate (skip first which is label)
  return Math.min(2, headerRow.length - 1);
}

/**
 * Detect if a row is a section header (has text in col 0 but no numbers, or
 * has text followed by numeric columns that look like a section total).
 */
function isSectionHeader(row: any[], valueCol: number): boolean {
  const label = String(row[0] ?? "").trim();
  if (!label || label.length < 2) return false;

  // Skip rows that look like grand totals
  const lower = label.toLowerCase();
  if (lower.includes("grand total") || lower.includes("sub total (bid form)") || lower === "total") {
    return false;
  }

  // Section headers typically have text in col 0 and often bold/colored
  // We use a heuristic: if col 0 has text AND the value column has a number
  // AND the label doesn't look like a line item (no detailed descriptions)
  const val = parseNumber(row[valueCol]);

  // If no value, it might be a header label only
  if (val === 0) {
    // Check if any other column has a number
    const hasAnyNumber = row.slice(1).some((c: any) => {
      const n = parseNumber(c);
      return n !== 0;
    });
    // Pure text row with no numbers = possible header
    return !hasAnyNumber && label.length > 3;
  }

  return false;
}

function isSubtotalRow(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("sub total") ||
    lower.includes("subtotal") ||
    lower.includes("section total") ||
    lower === "total" ||
    lower.includes("grand total") ||
    lower.includes("sub total (bid form)")
  );
}

function isGrandTotalRow(label: string): boolean {
  const lower = label.toLowerCase();
  return (
    lower.includes("grand total") ||
    lower.includes("sub total (bid form)") ||
    lower.includes("project total") ||
    lower === "total"
  );
}

// ============================================================================
// PARSER — Extract sections from a workbook
// ============================================================================

function parseWorkbookSections(workbook: any): { sections: ParsedSection[]; grandTotal: number } {
  const xlsx = require("xlsx");

  const sheetName = findMarginAnalysisSheet(workbook);
  if (!sheetName) {
    throw new Error("No Margin Analysis sheet found in workbook");
  }

  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (data.length < 3) {
    throw new Error("Sheet has too few rows to parse");
  }

  // Find header row (contains "cost", "selling", "price", etc.)
  let headerRowIdx = -1;
  for (let r = 0; r < Math.min(data.length, 30); r++) {
    const rowText = data[r].map((c: any) => String(c ?? "").toLowerCase()).join(" ");
    if (
      (rowText.includes("sell") || rowText.includes("price") || rowText.includes("amount")) &&
      (rowText.includes("cost") || rowText.includes("description") || rowText.includes("total"))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  if (headerRowIdx === -1) {
    // Fallback: use row 0 as header
    headerRowIdx = 0;
  }

  const valueCol = findValueColumn(data[headerRowIdx]);

  // Parse rows into sections
  const sections: ParsedSection[] = [];
  let currentSection: ParsedSection | null = null;
  let grandTotal = 0;

  for (let r = headerRowIdx + 1; r < data.length; r++) {
    const row = data[r];
    const label = String(row[0] ?? "").trim();
    if (!label) continue;

    const value = parseNumber(row[valueCol]);

    // Check for grand total
    if (isGrandTotalRow(label)) {
      grandTotal = value;
      continue;
    }

    // Check for subtotal
    if (isSubtotalRow(label)) {
      if (currentSection) {
        currentSection.total = value;
      }
      continue;
    }

    // Check for section header
    if (isSectionHeader(row, valueCol)) {
      // Save previous section
      if (currentSection && currentSection.rows.length > 0) {
        sections.push(currentSection);
      }
      currentSection = { name: label, rows: [], total: 0 };
      continue;
    }

    // Regular line item
    if (!currentSection) {
      currentSection = { name: "General", rows: [], total: 0 };
    }
    currentSection.rows.push({ label, value });
  }

  // Push last section
  if (currentSection && currentSection.rows.length > 0) {
    sections.push(currentSection);
  }

  // If no grand total was found, sum section totals
  if (grandTotal === 0) {
    grandTotal = sections.reduce((sum, s) => {
      const sTotal = s.total || s.rows.reduce((rs, r) => rs + r.value, 0);
      return sum + sTotal;
    }, 0);
  }

  // Ensure each section has a total
  for (const sec of sections) {
    if (sec.total === 0) {
      sec.total = sec.rows.reduce((sum, r) => sum + r.value, 0);
    }
  }

  return { sections, grandTotal };
}

// ============================================================================
// DIFF ENGINE
// ============================================================================

export function compareWorkbooks(
  originalWorkbook: any,
  revisedWorkbook: any,
  originalName: string = "Original",
  revisedName: string = "Revised"
): DeltaResult {
  const original = parseWorkbookSections(originalWorkbook);
  const revised = parseWorkbookSections(revisedWorkbook);

  // Build lookup maps by normalized section name
  const oldMap = new Map<string, ParsedSection>();
  for (const sec of original.sections) {
    oldMap.set(normalizeLabel(sec.name), sec);
  }

  const newMap = new Map<string, ParsedSection>();
  for (const sec of revised.sections) {
    newMap.set(normalizeLabel(sec.name), sec);
  }

  const deltaSections: DeltaSection[] = [];
  const processedNew = new Set<string>();

  // Compare original sections against revised
  for (const oldSec of original.sections) {
    const key = normalizeLabel(oldSec.name);
    const newSec = newMap.get(key);

    if (!newSec) {
      // Section removed in revised version
      deltaSections.push({
        sectionName: oldSec.name,
        oldTotal: oldSec.total,
        newTotal: 0,
        delta: -oldSec.total,
        pctChange: -100,
        rows: oldSec.rows.map((r) => ({
          label: r.label,
          oldValue: r.value,
          newValue: 0,
          delta: -r.value,
          pctChange: -100,
          changeType: "removed" as const,
        })),
        changeType: "removed",
      });
    } else {
      // Section exists in both — diff rows
      processedNew.add(key);
      const deltaRows = diffSectionRows(oldSec.rows, newSec.rows);
      const sectionDelta = newSec.total - oldSec.total;
      const hasChanges = deltaRows.some((r) => r.changeType !== "unchanged");

      deltaSections.push({
        sectionName: oldSec.name,
        oldTotal: oldSec.total,
        newTotal: newSec.total,
        delta: sectionDelta,
        pctChange: pctChange(oldSec.total, newSec.total),
        rows: deltaRows,
        changeType: hasChanges ? "changed" : "unchanged",
      });
    }
  }

  // Check for sections added in revised
  for (const newSec of revised.sections) {
    const key = normalizeLabel(newSec.name);
    if (processedNew.has(key)) continue;

    deltaSections.push({
      sectionName: newSec.name,
      oldTotal: 0,
      newTotal: newSec.total,
      delta: newSec.total,
      pctChange: null,
      rows: newSec.rows.map((r) => ({
        label: r.label,
        oldValue: 0,
        newValue: r.value,
        delta: r.value,
        pctChange: null,
        changeType: "added" as const,
      })),
      changeType: "added",
    });
  }

  const grandTotalDelta = revised.grandTotal - original.grandTotal;

  return {
    originalName,
    revisedName,
    sections: deltaSections,
    oldGrandTotal: original.grandTotal,
    newGrandTotal: revised.grandTotal,
    grandTotalDelta,
    grandTotalPctChange: pctChange(original.grandTotal, revised.grandTotal),
    totalSections: deltaSections.length,
    changedSections: deltaSections.filter((s) => s.changeType === "changed").length,
    addedSections: deltaSections.filter((s) => s.changeType === "added").length,
    removedSections: deltaSections.filter((s) => s.changeType === "removed").length,
    totalRowChanges: deltaSections.reduce(
      (sum, s) => sum + s.rows.filter((r) => r.changeType !== "unchanged").length,
      0
    ),
    comparedAt: new Date().toISOString(),
  };
}

function diffSectionRows(
  oldRows: { label: string; value: number }[],
  newRows: { label: string; value: number }[]
): DeltaRow[] {
  const result: DeltaRow[] = [];
  const oldMap = new Map<string, { label: string; value: number }>();
  for (const r of oldRows) {
    oldMap.set(normalizeLabel(r.label), r);
  }

  const matchedOld = new Set<string>();

  // Match new rows against old
  for (const nr of newRows) {
    const key = normalizeLabel(nr.label);
    const or = oldMap.get(key);

    if (or) {
      matchedOld.add(key);
      const delta = nr.value - or.value;
      result.push({
        label: nr.label,
        oldValue: or.value,
        newValue: nr.value,
        delta,
        pctChange: pctChange(or.value, nr.value),
        changeType: Math.abs(delta) < 0.01 ? "unchanged" : "changed",
      });
    } else {
      result.push({
        label: nr.label,
        oldValue: 0,
        newValue: nr.value,
        delta: nr.value,
        pctChange: null,
        changeType: "added",
      });
    }
  }

  // Check for removed rows
  for (const or of oldRows) {
    const key = normalizeLabel(or.label);
    if (!matchedOld.has(key)) {
      result.push({
        label: or.label,
        oldValue: or.value,
        newValue: 0,
        delta: -or.value,
        pctChange: -100,
        changeType: "removed",
      });
    }
  }

  return result;
}
