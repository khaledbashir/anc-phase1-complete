import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parsePricingTables } from "@/services/pricing/pricingTableParser";

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

function run() {
  testNoSummaryBleedAndTravelPreserved();
  testAlternateDeductCaptured();
  testCurrencyPrecisionPreserved();
  console.log("PASS: pricing parser regression suite");
}

run();
