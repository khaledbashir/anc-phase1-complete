import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parsePricingTables, parsePricingTablesWithValidation } from "@/services/pricing/pricingTableParser";

type SheetRow = Array<string | number | null | undefined>;

function workbookFromRows(rows: SheetRow[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  return {
    SheetNames: ["Margin Analysis"],
    Sheets: {
      "Margin Analysis": ws,
    },
  } as XLSX.WorkBook;
}

function mustParse(rows: SheetRow[], fileName: string) {
  const wb = workbookFromRows(rows);
  const parsed = parsePricingTables(wb, fileName);
  assert.ok(parsed, `Expected parser output for ${fileName}`);
  return parsed!;
}

function testNoSummaryBleedAndTravelPreserved() {
  const rows: SheetRow[] = [
    ["Description", "Cost", "Selling Price", "Margin $", "Margin %"],
    ["CMS Section"],
    ["LiveSync Hardware", 100, 130],
    ["Travel", 10, 13],
    ["SUB TOTAL", "", 143],
    ["TAX", "", 12.7],
    ["GRAND TOTAL", "", 155.7],
    ["Total Project Value", "", 999], // Sheet summary row; must not bleed into CMS section
    ["Travel", "", 100], // Sheet summary row; must not bleed into CMS section
    ["LG Rebate"], // Must not create ghost table
    ["Tax", "", 88],
    ["Second Section"],
    ["Line B", 50, 75],
    ["SUB TOTAL", "", 75],
    ["GRAND TOTAL", "", 75],
  ];

  const doc = mustParse(rows, "no-summary-bleed.xlsx");
  assert.equal(doc.tables.length, 2, "Expected 2 real sections");

  const cms = doc.tables[0];
  assert.equal(cms.items.length, 2, "CMS section should only have real line items");
  assert.deepEqual(
    cms.items.map((i) => i.description),
    ["LiveSync Hardware", "Travel"],
    "Travel inside section must remain a real editable line item"
  );
  assert.equal(cms.grandTotal, 155.7);
}

function testAlternateDeductCaptured() {
  const rows: SheetRow[] = [
    ["Description", "Cost", "Selling Price", "Margin $", "Margin %"],
    ["9C LED Display - Base"],
    ["Base Screen", 100, 120],
    ["SUB TOTAL", "", 120],
    ["GRAND TOTAL", "", 120],
    ["9C Alternate - Deduct Cost Above"],
    ["Alternate #1: Deduct option", "", -20],
    ["Next Section"],
    ["Line B", 10, 12],
    ["SUB TOTAL", "", 12],
    ["GRAND TOTAL", "", 12],
  ];

  const doc = mustParse(rows, "alternate-deduct.xlsx");
  assert.equal(doc.tables.length, 2, "Expected base + next section");

  const base = doc.tables[0];
  assert.equal(base.alternates.length, 1, "Expected one captured alternate");
  assert.equal(base.alternates[0].priceDifference, -20);
}

function testCurrencyPrecisionPreserved() {
  const rows: SheetRow[] = [
    ["Description", "Cost", "Selling Price", "Margin $", "Margin %"],
    ["CMS Section"],
    ["LiveSync Hardware", 200000.123456, 295323.69230769],
    ["SUB TOTAL", "", 295323.69230769],
    ["TAX", "", 26225.118461538],
    ["GRAND TOTAL", "", 321548.810769228],
  ];

  const doc = mustParse(rows, "rounding.xlsx");
  assert.equal(doc.tables.length, 1);
  const table = doc.tables[0];
  assert.equal(table.items[0].sellingPrice, 295323.69230769);
  assert.equal(table.subtotal, 295323.69230769);
  assert.equal(table.tax?.amount, 26225.118461538);
  assert.equal(table.grandTotal, 321548.810769228);
}

function testSingleBlockBudgetSheetParsesInStrictMode() {
  const rows: SheetRow[] = [
    ["Project Name: Demo Budget", "", "", "", ""],
    ["LED Video Displays", "Cost", "Selling Price", "Margin $", "Margin %"],
    ["Main Display", 1000, 1250, 250, 0.2],
    ["Structural Materials", 100, 125, 25, 0.2],
    ["", 1100, 1375, 275, 0.2],
    ["TAX", 0, 0, "", ""],
    ["BOND", 0, 0, "", ""],
    ["SUB TOTAL (BID FORM)", "", 1375, 275, 0.2],
  ];
  const wb = workbookFromRows(rows);
  const result = parsePricingTablesWithValidation(wb, "single-block-budget.xlsx", { strict: true });
  assert.equal(result.validation.status, "PASS", `strict validation should pass: ${result.validation.errors.join("; ")}`);
  assert.ok(result.document, "parser should produce document");
  const doc = result.document!;
  assert.ok(doc.tables.length >= 1, `expected at least 1 table, got ${doc.tables.length}`);
  const detail = doc.tables.find((t) => /led video displays/i.test(t.name)) || doc.tables[0];
  assert.ok(detail.items.length >= 2, "expected line items from single-block budget");
  assert.ok(Math.abs(doc.documentTotal - 1375) < 0.01, `expected document total 1375, got ${doc.documentTotal}`);
}

function testStrictFailOnMissingHeaders() {
  const wb = workbookFromRows([["foo", "bar"], ["x", "y"]]);
  const result = parsePricingTablesWithValidation(wb, "missing-headers.xlsx", { strict: true });
  assert.equal(result.document, null);
  assert.equal(result.validation.status, "FAIL");
  assert.ok(
    result.validation.errors.some((e) => /column headers/i.test(e)),
    "strict validation should fail when column headers are missing"
  );
}

function testStrictFailOnMalformedRespMatrixCandidate() {
  const wsMargin = XLSX.utils.aoa_to_sheet([
    ["Description", "Cost", "Selling Price", "Margin $", "Margin %"],
    ["CMS Section"],
    ["Line A", 10, 12],
    ["SUB TOTAL", "", 12],
    ["GRAND TOTAL", "", 12],
  ]);
  const wsResp = XLSX.utils.aoa_to_sheet([
    ["Project:", "Bad Matrix"],
    ["Date:", "02/12/2026"],
    ["", "", "", ""],
    ["", "", "", ""],
  ]);
  const wb = {
    SheetNames: ["Margin Analysis", "Resp Matrix-Client"],
    Sheets: {
      "Margin Analysis": wsMargin,
      "Resp Matrix-Client": wsResp,
    },
  } as XLSX.WorkBook;
  const result = parsePricingTablesWithValidation(wb, "bad-matrix.xlsx", { strict: true });
  assert.equal(result.document, null);
  assert.equal(result.validation.status, "FAIL");
  assert.ok(
    result.validation.errors.some((e) => /resp matrix/i.test(e)),
    "strict mode should fail when a resp matrix candidate exists but cannot be parsed"
  );
}

function run() {
  testNoSummaryBleedAndTravelPreserved();
  testAlternateDeductCaptured();
  testCurrencyPrecisionPreserved();
  testSingleBlockBudgetSheetParsesInStrictMode();
  testStrictFailOnMissingHeaders();
  testStrictFailOnMalformedRespMatrixCandidate();
  console.log("PASS: pricing parser regression suite");
}

run();
