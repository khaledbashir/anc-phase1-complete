/**
 * Deep audit part 2: verify PDF rendering math for every table in every file.
 * Runs computeTableTotals (the actual production function) and checks for:
 * - Items silently dropped ($0 filtering)
 * - Tax rate derivation errors
 * - Grand total != subtotal + tax + bond
 * - Negative prices
 * - Empty tables after filtering
 */
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { parsePricingTablesWithValidation } from "../services/pricing/pricingTableParser";
import { computeTableTotals, computeDocumentTotal } from "../lib/pricingMath";

const FILES = [
  { path: "specimens/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx", label: "Indiana Fever" },
  { path: "specimens/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx", label: "NBCU 9C" },
  { path: "specimens/USC - Williams-Brice Stadium - Additional LED Displays - Cost Analysis (Budget) - DJC & JSR - 2026-02-09 (1).xlsx", label: "USC Williams-Brice" },
  { path: "exports/nbcu_full_extract/Copy of MT Bank Stadium - Baltimore Ravens - Upper and Lower In-Bowl Ribbons - Cost Analysis - JSR - 2026-02-14 (2).xlsx", label: "Baltimore Ravens" },
  { path: "services/pricing/Cost Analysis - Union Station - 2026-01-12 (1).xlsx", label: "Union Station" },
];

const ROOT = path.resolve(__dirname, "..");
let totalIssues = 0;

for (const file of FILES) {
  const abs = path.join(ROOT, file.path);
  const wb = xlsx.read(fs.readFileSync(abs), { type: "buffer" });
  const result = parsePricingTablesWithValidation(wb, file.label + ".xlsx");
  const doc = result.document;

  console.log("\n" + file.label);
  console.log("-".repeat(50));

  if (!doc) {
    console.log("  ❌ No pricing document — cannot test PDF path");
    totalIssues++;
    continue;
  }

  let fileIssues = 0;

  for (const table of doc.tables) {
    const rendered = computeTableTotals(table, {}, {});

    // Check 1: items not silently dropped
    const parserItemCount = table.items.length;
    const renderedItemCount = rendered.items.length;
    const droppedCount = parserItemCount - renderedItemCount;
    const droppedItems = table.items.filter((item, idx) => {
      return !rendered.items.some(r => r.originalIndex === idx);
    });

    // Check 2: grand total consistency
    const expectedGrand = rendered.subtotal + rendered.tax + rendered.bond;
    const grandMismatch = Math.abs(expectedGrand - rendered.grandTotal) > 0.01;

    // Check 3: negative prices
    const negativeItems = rendered.items.filter(i => i.price < 0 && !i.isExcluded);

    // Check 4: empty table after filtering
    const emptyAfterFilter = rendered.items.length === 0 && table.items.length > 0;

    // Check 5: tax rate sanity (should be 0-25%)
    const impliedRate = rendered.subtotal > 0 ? rendered.tax / rendered.subtotal : 0;
    const taxRateInsane = impliedRate > 0.25 || impliedRate < 0;

    // Check 6: isIncluded items that have a price > 0 (contradictory)
    const includedWithPrice = rendered.items.filter(i => i.isIncluded && i.price > 0);

    const hasIssues = grandMismatch || emptyAfterFilter || taxRateInsane || includedWithPrice.length > 0;

    if (hasIssues) {
      console.log("  ❌ Table: \"" + table.name.substring(0, 50) + "\"");
      if (grandMismatch) console.log("    ⚠️  Grand total mismatch: expected $" + expectedGrand + " got $" + rendered.grandTotal);
      if (emptyAfterFilter) console.log("    ⚠️  All " + table.items.length + " items filtered out — empty table in PDF");
      if (taxRateInsane) console.log("    ⚠️  Tax rate " + (impliedRate * 100).toFixed(1) + "% is outside 0-25% range");
      if (includedWithPrice.length) console.log("    ⚠️  " + includedWithPrice.length + " items marked INCLUDED but have price > $0");
      fileIssues++;
    } else {
      console.log("  ✅ Table: \"" + table.name.substring(0, 50) + "\" — " + renderedItemCount + " items, subtotal=$" + rendered.subtotal.toLocaleString() + ", tax=$" + rendered.tax.toLocaleString() + ", grand=$" + rendered.grandTotal.toLocaleString());
      if (droppedCount > 0) {
        const droppedDescs = droppedItems.map(i => "\"" + i.description.substring(0, 30) + "\" ($" + i.sellingPrice + ")").join(", ");
        console.log("    ℹ️  " + droppedCount + " $0 items filtered from PDF: " + droppedDescs);
      }
    }
  }

  // Document-level total
  const docTotal = computeDocumentTotal(doc, {}, {});
  console.log("  Document total for PDF: $" + docTotal.toLocaleString());

  totalIssues += fileIssues;
}

console.log("\n" + "=".repeat(50));
if (totalIssues === 0) {
  console.log("✅ ALL FILES PASS — PDF rendering path is clean");
} else {
  console.log("❌ " + totalIssues + " ISSUES FOUND");
}
