/**
 * Deep audit: run every parser function against every real Excel file.
 * Tests the actual production code paths, not simplified scripts.
 */
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";
import { parsePricingTablesWithValidation } from "../services/pricing/pricingTableParser";
import { parseRespMatrixDetailed } from "../services/pricing/respMatrixParser";
import { parseFormSheet } from "../services/specsheet/formSheetParser";
import { findLedOrCostSheet, findMarginAnalysisSheet } from "../lib/sheetDetection";

const FILES = [
  { path: "specimens/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx", label: "Indiana Fever" },
  { path: "specimens/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx", label: "NBCU 9C" },
  { path: "specimens/USC - Williams-Brice Stadium - Additional LED Displays - Cost Analysis (Budget) - DJC & JSR - 2026-02-09 (1).xlsx", label: "USC Williams-Brice" },
  { path: "exports/nbcu_full_extract/Copy of MT Bank Stadium - Baltimore Ravens - Upper and Lower In-Bowl Ribbons - Cost Analysis - JSR - 2026-02-14 (2).xlsx", label: "Baltimore Ravens" },
  { path: "services/pricing/Cost Analysis - Union Station - 2026-01-12 (1).xlsx", label: "Union Station" },
];

const ROOT = path.resolve(__dirname, "..");

for (const file of FILES) {
  const abs = path.join(ROOT, file.path);
  const buffer = fs.readFileSync(abs);
  const wb = xlsx.read(buffer, { type: "buffer" });

  console.log("\n" + "=".repeat(70));
  console.log("FILE: " + file.label);
  console.log("=".repeat(70));

  // ── 1. Sheet Detection ──
  const ledSheet = findLedOrCostSheet(wb);
  const marginSheet = findMarginAnalysisSheet(wb);
  console.log("\n[SHEET DETECTION]");
  console.log("  LED sheet: " + (ledSheet ?? "NOT FOUND"));
  console.log("  Margin sheet: " + (marginSheet ?? "NOT FOUND"));
  if (!ledSheet) console.log("  ⚠️  NO LED SHEET — screens will not be extracted");
  if (!marginSheet) console.log("  ⚠️  NO MARGIN SHEET — pricing will not be extracted");

  // ── 2. Pricing Parser (full production path) ──
  console.log("\n[PRICING PARSER]");
  try {
    const result = parsePricingTablesWithValidation(wb, file.label + ".xlsx");
    const doc = result.document;
    const val = result.validation;
    if (doc) {
      console.log("  Mode: " + doc.mode);
      console.log("  Tables: " + doc.tables.length);
      console.log("  Document total: $" + doc.documentTotal.toLocaleString());
      for (const t of doc.tables) {
        console.log("    Table: \"" + t.name.substring(0, 50) + "\" — " + t.items.length + " items, subtotal=$" + t.subtotal.toLocaleString() + ", grandTotal=$" + t.grandTotal.toLocaleString());
        // Check for suspicious items
        for (const item of t.items) {
          if (item.sellingPrice < 0) console.log("      ⚠️  Negative price: \"" + item.description + "\" = $" + item.sellingPrice);
          if (item.description.length > 200) console.log("      ⚠️  Very long description: " + item.description.length + " chars");
        }
        if (t.tax !== null) console.log("    Tax: " + JSON.stringify(t.tax));
        if (t.bond > 0) console.log("    Bond: $" + t.bond);
        if (t.alternates.length > 0) console.log("    Alternates: " + t.alternates.length);
      }
      // Verify document total matches sum of table grand totals
      const sumGrandTotals = doc.tables.reduce((s, t) => s + t.grandTotal, 0);
      if (Math.abs(sumGrandTotals - doc.documentTotal) > 1) {
        console.log("  ⚠️  Document total ($" + doc.documentTotal + ") != sum of table grand totals ($" + sumGrandTotals + ")");
      }
    } else {
      console.log("  ❌ No document returned");
      console.log("  Errors: " + (val.errors?.join(", ") || "none"));
    }
    if (val.warnings?.length) console.log("  Warnings: " + val.warnings.join(", "));
  } catch (e: any) {
    console.log("  ❌ EXCEPTION: " + e.message);
  }

  // ── 3. Resp Matrix (full production path) ──
  console.log("\n[RESP MATRIX]");
  try {
    const resp = parseRespMatrixDetailed(wb);
    console.log("  Candidates: " + resp.sheetCandidates.join(", ") || "none");
    console.log("  Used sheet: " + (resp.usedSheet ?? "none"));
    if (resp.matrix) {
      console.log("  Categories: " + resp.matrix.categories.length);
      for (const cat of resp.matrix.categories) {
        console.log("    \"" + cat.name.substring(0, 50) + "\" — " + cat.items.length + " items");
      }
    } else {
      console.log("  Matrix: null");
      if (resp.errors.length) console.log("  Errors: " + resp.errors.join(", "));
    }
  } catch (e: any) {
    console.log("  ❌ EXCEPTION: " + e.message);
  }

  // ── 4. Form Sheet (if present) ──
  console.log("\n[FORM SHEET]");
  try {
    const form = parseFormSheet(wb);
    if (form.displays.length > 0) {
      console.log("  Project: " + form.projectName);
      console.log("  Venue: " + form.venueName);
      console.log("  Displays: " + form.displays.length);
      for (const d of form.displays) {
        const missing = [];
        if (!d.displayName) missing.push("displayName");
        if (!d.manufacturer) missing.push("manufacturer");
        if (!d.model) missing.push("model");
        if (d.pixelPitch === null) missing.push("pixelPitch");
        console.log("    \"" + (d.displayName || "unnamed").substring(0, 50) + "\" — " + (missing.length ? "⚠️ missing: " + missing.join(", ") : "✅ complete"));
      }
    } else {
      console.log("  No displays found" + (form.warnings.length ? " — " + form.warnings.join(", ") : ""));
    }
  } catch (e: any) {
    console.log("  ❌ EXCEPTION: " + e.message);
  }
}

console.log("\n" + "=".repeat(70));
console.log("DEEP AUDIT COMPLETE");
console.log("=".repeat(70));
