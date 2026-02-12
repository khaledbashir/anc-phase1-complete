/**
 * RespMatrixParser - Parses "Resp Matrix" sheet from ANC Excel workbooks
 *
 * Extracts Statement of Work data in two formats:
 * - Short/paragraph: "Include Statement" items → category headers + paragraph text
 * - Long/table: "X" marks → DESCRIPTION | ANC | PURCHASER table
 * - Hybrid: mix of both
 *
 * Only ~10% of Excel files contain this sheet.
 */

import {
  RespMatrix,
  RespMatrixCategory,
  RespMatrixItem,
} from "@/types/pricing";

/**
 * Find the responsibility matrix sheet in a workbook.
 * Supports real-world naming variants:
 * - "Resp Matrix"
 * - "Resp Matrix-NBCU"
 * - "Resp Matrix - XXX"
 * Prioritizes non-example sheets when multiple candidates exist.
 */
function findRespMatrixSheet(workbook: any): string | null {
  const names: string[] = workbook.SheetNames || [];
  if (names.length === 0) return null;

  const normalize = (v: string) => v.trim().toLowerCase().replace(/\s+/g, " ");

  const candidates = names.filter((name) => {
    const n = normalize(name);
    return /^resp\s*matrix\b/.test(n);
  });

  if (candidates.length === 0) return null;

  const nonExample = candidates.filter((name) => !/\bexample\b/i.test(name));
  return (nonExample[0] || candidates[0] || null);
}

/**
 * Detect if a row is a category header.
 * Category headers have text in col B and col C contains "ANC", "YES", or similar header keywords.
 */
function isCategoryHeader(row: any[]): boolean {
  const colB = String(row[1] ?? "").trim();
  const colC = String(row[2] ?? "").trim().toUpperCase();
  const colD = String(row[3] ?? "").trim().toUpperCase();

  if (!colB) return false;

  // Category header patterns: col C has "ANC"/"YES" and col D has "PURCHASER"/"COLUMN1"/"NO"
  const ancHeaders = ["ANC", "YES", "SELLER"];
  const purchaserHeaders = ["PURCHASER", "COLUMN1", "NO", "BUYER", "OWNER", "CLIENT"];

  const cIsHeader = ancHeaders.some((h) => colC === h || colC.startsWith(h));
  const dIsHeader = purchaserHeaders.some((h) => colD === h || colD.startsWith(h));

  return cIsHeader && dIsHeader;
}

/**
 * Check if a row is an artifact/skip row
 */
function isArtifactRow(row: any[]): boolean {
  const colB = String(row[1] ?? "").trim().toUpperCase();
  return ["COLUMN1", "COLUMN2", "COLUMN3", ""].includes(colB);
}

/**
 * Detect format based on ANC column values across all items
 */
function detectFormat(categories: RespMatrixCategory[]): "short" | "long" | "hybrid" {
  let includeStatementCount = 0;
  let xCount = 0;
  let totalItems = 0;

  for (const cat of categories) {
    for (const item of cat.items) {
      totalItems++;
      const ancUpper = item.anc.toUpperCase().trim();
      if (ancUpper === "INCLUDE STATEMENT" || ancUpper === "INCLUDED STATEMENT") {
        includeStatementCount++;
      } else if (ancUpper.startsWith("X")) {
        xCount++;
      }
    }
  }

  if (totalItems === 0) return "short";
  if (includeStatementCount > 0 && xCount > 0) return "hybrid";
  if (xCount > includeStatementCount) return "long";
  return "short";
}

/**
 * Parse the Resp Matrix sheet from an Excel workbook.
 * Returns null if no "Resp Matrix" sheet is found.
 */
export function parseRespMatrix(workbook: any): RespMatrix | null {
  const sheetName = findRespMatrixSheet(workbook);
  if (!sheetName) return null;

  console.log(`[RESP MATRIX] Found sheet: "${sheetName}"`);

  const xlsx = require("xlsx");
  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (data.length < 4) {
    console.warn("[RESP MATRIX] Sheet has fewer than 4 rows, skipping");
    return null;
  }

  // Extract project name and date from top rows (rows 0-3)
  let projectName = "";
  let date = "";
  for (let i = 0; i < Math.min(data.length, 5); i++) {
    const row = data[i] || [];
    const cellA = String(row[0] ?? "").trim();
    const cellB = String(row[1] ?? "").trim();
    const combined = `${cellA} ${cellB}`.trim();

    if (!projectName && combined.length > 3 && !/^(date|resp|matrix|anc|column)/i.test(combined)) {
      projectName = combined;
    }
    if (!date && /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(combined)) {
      const match = combined.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
      if (match) date = match[0];
    }
  }

  // Parse categories and items
  const categories: RespMatrixCategory[] = [];
  let currentCategory: RespMatrixCategory | null = null;

  // Scan from row 3 onwards (skip title/date rows)
  for (let i = 2; i < data.length; i++) {
    const row = data[i] || [];

    // Skip artifact rows
    if (isArtifactRow(row)) continue;

    // Check for category header
    if (isCategoryHeader(row)) {
      // Save previous category
      if (currentCategory && currentCategory.items.length > 0) {
        categories.push(currentCategory);
      }
      currentCategory = {
        name: String(row[1] ?? "").trim(),
        items: [],
      };
      continue;
    }

    // Regular item row
    const description = String(row[1] ?? "").trim();
    if (!description) continue;

    // Skip rows that look like sub-headers or repeated column labels
    const descUpper = description.toUpperCase();
    if (descUpper === "ANC" || descUpper === "PURCHASER" || descUpper === "DESCRIPTION") continue;

    const ancValue = String(row[2] ?? "").trim();
    const purchaserValue = String(row[3] ?? "").trim();

    // Skip rows with no values in either column (pure empty rows)
    if (!ancValue && !purchaserValue) continue;

    const item: RespMatrixItem = {
      description,
      anc: ancValue,
      purchaser: purchaserValue,
    };

    if (currentCategory) {
      currentCategory.items.push(item);
    } else {
      // Items before any category header — create a default category
      currentCategory = { name: "GENERAL", items: [item] };
    }
  }

  // Push final category
  if (currentCategory && currentCategory.items.length > 0) {
    categories.push(currentCategory);
  }

  if (categories.length === 0) {
    console.warn("[RESP MATRIX] No categories with items found");
    return null;
  }

  const format = detectFormat(categories);
  console.log(`[RESP MATRIX] Parsed ${categories.length} categories, format: ${format}`);
  for (const cat of categories) {
    console.log(`[RESP MATRIX]   "${cat.name}": ${cat.items.length} items`);
  }

  return {
    projectName,
    date,
    format,
    categories,
  };
}
