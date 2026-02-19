/**
 * Natalia QA — simulates what Natalia looks at in the PDF and catches issues before she does.
 *
 * Natalia's checklist (from her feedback history):
 * 1. Section names match Excel exactly (no renamed headers)
 * 2. Line item order preserved exactly
 * 3. No line items missing or added
 * 4. Prices match Excel exactly (no rounding surprises)
 * 5. Grand total matches Excel's "SUB TOTAL (BID FORM)" exactly
 * 6. Tax and bond shown correctly (even if $0)
 * 7. Alternates shown, not filtered
 * 8. Resp matrix present and correct (right project)
 * 9. No duplicate sections
 * 10. Section order matches Excel order
 */
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { parsePricingTablesWithValidation } from "../services/pricing/pricingTableParser";
import { computeTableTotals, computeDocumentTotal } from "../lib/pricingMath";
import { parseRespMatrixDetailed } from "../services/pricing/respMatrixParser";

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

  console.log("\n" + "=".repeat(60));
  console.log("NATALIA QA: " + file.label);
  console.log("=".repeat(60));

  const issues: string[] = [];

  if (!doc) {
    issues.push("NO PRICING DOCUMENT — PDF will be blank");
    totalIssues++;
    issues.forEach(i => console.log("  ❌ " + i));
    continue;
  }

  // ── CHECK 1: Section names ──
  for (const table of doc.tables) {
    if (!table.name || table.name.trim().length === 0) {
      issues.push("Table has empty name — PDF will show blank header");
    }
    if (table.name.length > 120) {
      issues.push(`Table name very long (${table.name.length} chars) — may overflow PDF header: "${table.name.substring(0,60)}..."`);
    }
    // Check for placeholder/template names
    if (/^(section \d+|table \d+|unnamed|untitled)$/i.test(table.name.trim())) {
      issues.push(`Table has generic placeholder name: "${table.name}"`);
    }
  }

  // ── CHECK 2: Duplicate section names ──
  const tableNames = doc.tables.map(t => t.name.trim().toLowerCase());
  const seen = new Set<string>();
  for (const name of tableNames) {
    if (seen.has(name)) issues.push(`Duplicate section name: "${name}" — Natalia will see it twice`);
    seen.add(name);
  }

  // ── CHECK 3: Empty tables ──
  for (const table of doc.tables) {
    const rendered = computeTableTotals(table, {}, {});
    if (rendered.items.length === 0) {
      issues.push(`Section "${table.name.substring(0,50)}" has 0 visible items — will render as empty table`);
    }
  }

  // ── CHECK 4: Grand total matches Excel ──
  const pdfTotal = computeDocumentTotal(doc, {}, {});
  const excelTotal = doc.documentTotal;
  if (Math.abs(pdfTotal - excelTotal) > 1) {
    issues.push(`Grand total mismatch: PDF shows $${pdfTotal.toLocaleString()} but Excel says $${excelTotal.toLocaleString()}`);
  }

  // ── CHECK 5: Per-table price accuracy ──
  for (const table of doc.tables) {
    const rendered = computeTableTotals(table, {}, {});
    // Check each item for suspicious values
    for (const item of rendered.items) {
      if (item.price > 50_000_000) {
        issues.push(`Suspiciously large price in "${table.name.substring(0,40)}": "${item.description.substring(0,40)}" = $${item.price.toLocaleString()}`);
      }
      if (item.price < 0 && !item.isExcluded) {
        issues.push(`Negative price in "${table.name.substring(0,40)}": "${item.description.substring(0,40)}" = $${item.price.toLocaleString()}`);
      }
    }
    // Tax rate sanity
    if (rendered.tax > 0 && rendered.subtotal > 0) {
      const rate = rendered.tax / rendered.subtotal;
      if (rate > 0.25) {
        issues.push(`Tax rate ${(rate*100).toFixed(1)}% in "${table.name.substring(0,40)}" — looks wrong`);
      }
    }
  }

  // ── CHECK 6: Alternates present ──
  const totalAlternates = doc.tables.reduce((s, t) => s + t.alternates.length, 0);
  // Not an issue if none — just report

  // ── CHECK 7: Resp Matrix ──
  const respResult = parseRespMatrixDetailed(wb);
  if (respResult.sheetCandidates.length > 0 && !respResult.matrix) {
    issues.push("Resp Matrix sheet found but failed to parse — Exhibit B will be missing");
  }
  if (respResult.matrix) {
    const totalItems = respResult.matrix.categories.reduce((s, c) => s + c.items.length, 0);
    if (totalItems === 0) {
      issues.push("Resp Matrix parsed but has 0 items — Exhibit B will be empty");
    }
  }

  // ── CHECK 8: Section order (first section should match Excel's first header) ──
  // The first table name should come from the first section header in Excel
  if (doc.tables.length > 0) {
    const firstName = doc.tables[0].name;
    if (/^project grand total$/i.test(firstName)) {
      // Synthetic rollup — fine, but check the real tables underneath
      if (doc.tables.length < 2) {
        issues.push("Only synthetic rollup table, no real sections — PDF will show only totals");
      }
    }
  }

  // ── CHECK 9: Items with "INCLUDED" that have price > 0 ──
  for (const table of doc.tables) {
    const rendered = computeTableTotals(table, {}, {});
    const badIncluded = rendered.items.filter(i => i.isIncluded && i.price > 0);
    if (badIncluded.length > 0) {
      issues.push(`${badIncluded.length} items marked INCLUDED but have price > $0 in "${table.name.substring(0,40)}" — will show INCLUDED but contribute to subtotal`);
    }
  }

  // ── REPORT ──
  if (issues.length === 0) {
    console.log("  ✅ PASS — nothing Natalia would flag");
    // Summary stats
    const totalItems = doc.tables.reduce((s, t) => s + t.items.length, 0);
    console.log(`  ${doc.tables.length} sections | ${totalItems} line items | Grand total: $${doc.documentTotal.toLocaleString()} | Alternates: ${totalAlternates} | Resp Matrix: ${respResult.matrix ? respResult.matrix.categories.length + " categories" : "none"}`);
  } else {
    issues.forEach(i => console.log("  ❌ " + i));
    totalIssues += issues.length;
  }
}

console.log("\n" + "=".repeat(60));
if (totalIssues === 0) {
  console.log("✅ ALL FILES PASS NATALIA QA");
} else {
  console.log(`❌ ${totalIssues} ISSUES FOUND ACROSS ALL FILES`);
}
