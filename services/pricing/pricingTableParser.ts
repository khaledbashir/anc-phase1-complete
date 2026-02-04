/**
 * PricingTableParser - Enterprise-grade Excel to PricingTable[] converter
 *
 * Parses any Margin Analysis Excel format into normalized PricingTable[] structure.
 * Designed for Natalia's "Mirror Mode" - exact replication of Excel pricing.
 */

import {
  PricingTable,
  PricingLineItem,
  AlternateItem,
  TaxInfo,
  PricingDocument,
  createTableId,
  detectCurrency,
} from "@/types/pricing";

// ============================================================================
// TYPES
// ============================================================================

interface RawRow {
  rowIndex: number;
  cells: any[];
  label: string;
  labelNorm: string;
  cost: number;
  sell: number;
  margin: number;
  marginPct: number;
  isEmpty: boolean;
  isHeader: boolean;
  isSubtotal: boolean;
  isTax: boolean;
  isBond: boolean;
  isGrandTotal: boolean;
  isAlternateHeader: boolean;
  isAlternateLine: boolean;
}

interface ColumnMap {
  label: number;
  cost: number;
  sell: number;
  margin: number;
  marginPct: number;
}

interface TableBoundary {
  name: string;
  startRow: number;
  endRow: number;
  alternatesStartRow: number | null;
  alternatesEndRow: number | null;
}

// ============================================================================
// MAIN PARSER
// ============================================================================

/**
 * Parse Excel workbook and extract PricingDocument
 */
export function parsePricingTables(
  workbook: any,
  fileName: string = "import.xlsx"
): PricingDocument | null {
  // 1. Find Margin Analysis sheet
  const sheetName = findMarginAnalysisSheet(workbook);
  if (!sheetName) {
    console.log("[PRICING PARSER] No Margin Analysis sheet found");
    return null;
  }
  console.log(`[PRICING PARSER] Found sheet: "${sheetName}"`);

  // 2. Get sheet data as 2D array
  const xlsx = require("xlsx");
  const sheet = workbook.Sheets[sheetName];
  const data: any[][] = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  // 3. Detect currency from sheet name
  const currency = detectCurrency(sheetName);
  console.log(`[PRICING PARSER] Detected currency: ${currency}`);

  // 4. Find column headers
  const columnMap = findColumnHeaders(data);
  if (!columnMap) {
    console.log("[PRICING PARSER] Could not find valid column headers");
    return null;
  }
  console.log(`[PRICING PARSER] Column map: label@${columnMap.label}, cost@${columnMap.cost}, sell@${columnMap.sell}`);

  // 5. Parse all rows with metadata
  const rows = parseAllRows(data, columnMap);
  console.log(`[PRICING PARSER] Parsed ${rows.length} rows`);

  // 6. Identify table boundaries
  const boundaries = findTableBoundaries(rows);
  console.log(`[PRICING PARSER] Found ${boundaries.length} table(s)`);

  // 7. Extract PricingTable for each boundary
  const tables = boundaries.map((boundary, idx) =>
    extractTable(rows, boundary, idx, currency)
  );

  // 8. Calculate document total
  const documentTotal = tables.reduce((sum, t) => sum + t.grandTotal, 0);

  // 9. Build metadata
  const metadata = {
    importedAt: new Date().toISOString(),
    fileName,
    tablesCount: tables.length,
    itemsCount: tables.reduce((sum, t) => sum + t.items.length, 0),
    alternatesCount: tables.reduce((sum, t) => sum + t.alternates.length, 0),
  };

  console.log(`[PRICING PARSER] Complete: ${metadata.tablesCount} tables, ${metadata.itemsCount} items, ${metadata.alternatesCount} alternates`);

  return {
    tables,
    mode: "MIRROR",
    sourceSheet: sheetName,
    currency,
    documentTotal,
    metadata,
  };
}

// ============================================================================
// SHEET DETECTION
// ============================================================================

/**
 * Find the Margin Analysis sheet (supports variations)
 */
function findMarginAnalysisSheet(workbook: any): string | null {
  const sheetNames = Object.keys(workbook.Sheets);

  // Priority order for matching
  const patterns = [
    /^margin\s*analysis\s*\(cad\)$/i,
    /^margin\s*analysis\s*\(usd\)$/i,
    /^margin\s*analysis$/i,
    /margin\s*analysis/i,
  ];

  for (const pattern of patterns) {
    const match = sheetNames.find((name) => pattern.test(name));
    if (match) return match;
  }

  return null;
}

// ============================================================================
// COLUMN DETECTION
// ============================================================================

/**
 * Find column headers dynamically
 */
function findColumnHeaders(data: any[][]): ColumnMap | null {
  const norm = (s: any) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

  // Search first 40 rows for header row
  for (let i = 0; i < Math.min(data.length, 40); i++) {
    const row = data[i] || [];
    const cells = row.map(norm);

    // Find cost column
    const costIdx = cells.findIndex((c) =>
      c === "cost" ||
      c === "budgeted cost" ||
      c === "total cost" ||
      c === "project cost"
    );

    // Find sell column
    const sellIdx = cells.findIndex((c) =>
      c === "selling price" ||
      c === "sell price" ||
      c === "revenue" ||
      c === "sell" ||
      c === "price" ||
      c === "total price" ||
      c === "amount"
    );

    if (costIdx !== -1 && sellIdx !== -1) {
      // Label is typically to the left of cost, or column 0
      const labelIdx = costIdx > 0 ? costIdx - 1 : 0;

      // Margin columns (optional)
      const marginIdx = cells.findIndex((c) =>
        c === "margin $" || c === "margin amount" || c === "margin"
      );
      const marginPctIdx = cells.findIndex((c) =>
        c === "margin %" || c === "margin percent" || c === "%"
      );

      return {
        label: labelIdx,
        cost: costIdx,
        sell: sellIdx,
        margin: marginIdx !== -1 ? marginIdx : sellIdx + 1,
        marginPct: marginPctIdx !== -1 ? marginPctIdx : sellIdx + 2,
      };
    }
  }

  return null;
}

// ============================================================================
// ROW PARSING
// ============================================================================

/**
 * Parse all rows and add metadata
 */
function parseAllRows(data: any[][], columnMap: ColumnMap): RawRow[] {
  const norm = (s: any) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const rows: RawRow[] = [];

  // Find header row index
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(data.length, 40); i++) {
    const row = data[i] || [];
    const cells = row.map(norm);
    if (cells[columnMap.cost] === "cost" ||
        cells[columnMap.cost] === "budgeted cost" ||
        cells[columnMap.sell] === "selling price" ||
        cells[columnMap.sell] === "revenue") {
      headerRowIdx = i;
      break;
    }
  }

  // Parse rows after header
  for (let i = headerRowIdx + 1; i < data.length; i++) {
    const row = data[i] || [];
    const label = String(row[columnMap.label] ?? "").trim();
    const labelNorm = norm(label);

    const cost = parseNumber(row[columnMap.cost]);
    const sell = parseNumber(row[columnMap.sell]);
    const margin = parseNumber(row[columnMap.margin]);
    const marginPct = parseNumber(row[columnMap.marginPct]);

    const isEmpty = !label && !Number.isFinite(sell);
    const hasNumericData = Number.isFinite(cost) || Number.isFinite(sell);

    // Detect row types
    const isHeader = !isEmpty && !hasNumericData && label.length > 0 && !labelNorm.includes("alternate");
    const isSubtotal = labelNorm.includes("subtotal") || labelNorm.includes("sub total") || (labelNorm === "" && hasNumericData);
    const isTax = labelNorm === "tax" || labelNorm.startsWith("tax ");
    const isBond = labelNorm === "bond";
    const isGrandTotal = labelNorm.includes("grand total") || labelNorm.includes("sub total (bid form)") || labelNorm === "total";
    const isAlternateHeader = labelNorm.includes("alternate") && !hasNumericData;
    const isAlternateLine = labelNorm.startsWith("alt ") || labelNorm.startsWith("alt-") || labelNorm.includes("alternate");

    rows.push({
      rowIndex: i,
      cells: row,
      label,
      labelNorm,
      cost,
      sell,
      margin,
      marginPct,
      isEmpty,
      isHeader,
      isSubtotal,
      isTax,
      isBond,
      isGrandTotal,
      isAlternateHeader,
      isAlternateLine: isAlternateLine && hasNumericData,
    });
  }

  return rows;
}

/**
 * Parse number from cell (handles currency formatting)
 */
function parseNumber(value: any): number {
  if (typeof value === "number") return value;
  if (!value) return NaN;
  const str = String(value).replace(/[$,]/g, "").trim();
  return parseFloat(str);
}

// ============================================================================
// TABLE BOUNDARY DETECTION
// ============================================================================

/**
 * Find table boundaries (each location = one table)
 */
function findTableBoundaries(rows: RawRow[]): TableBoundary[] {
  const boundaries: TableBoundary[] = [];
  let currentTable: Partial<TableBoundary> | null = null;
  let inAlternates = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Skip empty rows
    if (row.isEmpty) continue;

    // New section header starts a new table
    if (row.isHeader && !row.isAlternateHeader) {
      // Close previous table
      if (currentTable && currentTable.name) {
        currentTable.endRow = i - 1;
        boundaries.push(currentTable as TableBoundary);
      }

      // Start new table
      currentTable = {
        name: row.label,
        startRow: i,
        endRow: -1,
        alternatesStartRow: null,
        alternatesEndRow: null,
      };
      inAlternates = false;
      continue;
    }

    // Alternates header
    if (row.isAlternateHeader && currentTable) {
      currentTable.alternatesStartRow = i;
      inAlternates = true;
      continue;
    }

    // Grand total marks end of main section
    if (row.isGrandTotal && currentTable && !inAlternates) {
      currentTable.endRow = i;
    }

    // Track alternates end
    if (inAlternates && currentTable && row.isAlternateLine) {
      currentTable.alternatesEndRow = i;
    }
  }

  // Close final table
  if (currentTable && currentTable.name) {
    if (currentTable.endRow === -1) {
      currentTable.endRow = rows.length - 1;
    }
    boundaries.push(currentTable as TableBoundary);
  }

  return boundaries;
}

// ============================================================================
// TABLE EXTRACTION
// ============================================================================

/**
 * Extract a PricingTable from rows within a boundary
 */
function extractTable(
  rows: RawRow[],
  boundary: TableBoundary,
  index: number,
  currency: "CAD" | "USD"
): PricingTable {
  const items: PricingLineItem[] = [];
  let subtotal = 0;
  let tax: TaxInfo | null = null;
  let bond = 0;
  let grandTotal = 0;
  const alternates: AlternateItem[] = [];

  // Extract main items
  for (let i = boundary.startRow; i <= boundary.endRow; i++) {
    const row = rows[i];
    if (!row) continue;

    // Skip header row
    if (row.isHeader) continue;

    // Capture subtotal (row with empty label but has sell value)
    if (row.isSubtotal && !row.label && Number.isFinite(row.sell)) {
      subtotal = row.sell;
      continue;
    }

    // Capture tax
    if (row.isTax) {
      const rate = parseNumber(row.cells[row.cells.findIndex((c: any) =>
        String(c).includes("0.") || String(c).includes("%")
      )]) || 0;
      tax = {
        label: row.label || "Tax",
        rate: rate > 1 ? rate / 100 : rate,
        amount: row.sell || 0,
      };
      continue;
    }

    // Capture bond
    if (row.isBond) {
      bond = row.sell || 0;
      continue;
    }

    // Capture grand total
    if (row.isGrandTotal) {
      grandTotal = row.sell || 0;
      continue;
    }

    // Regular line item
    if (row.label && Number.isFinite(row.sell) && !row.isAlternateLine) {
      items.push({
        description: row.label,
        sellingPrice: row.sell,
        isIncluded: row.sell === 0,
        sourceRow: row.rowIndex,
      });
    }
  }

  // Extract alternates
  if (boundary.alternatesStartRow !== null) {
    const endRow = boundary.alternatesEndRow ?? rows.length - 1;
    for (let i = boundary.alternatesStartRow; i <= endRow; i++) {
      const row = rows[i];
      if (!row) continue;

      if (row.isAlternateLine && row.label && Number.isFinite(row.sell)) {
        alternates.push({
          description: row.label,
          priceDifference: row.sell, // Already negative in Excel
          sourceRow: row.rowIndex,
        });
      }
    }
  }

  // If no subtotal found, calculate it
  if (subtotal === 0) {
    subtotal = items.reduce((sum, item) => sum + item.sellingPrice, 0);
  }

  // If no grand total found, calculate it
  if (grandTotal === 0) {
    grandTotal = subtotal + (tax?.amount || 0) + bond;
  }

  return {
    id: createTableId(boundary.name, index),
    name: boundary.name,
    currency,
    items,
    subtotal,
    tax,
    bond,
    grandTotal,
    alternates,
    sourceStartRow: boundary.startRow,
    sourceEndRow: boundary.endRow,
  };
}
