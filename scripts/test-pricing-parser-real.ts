import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { parsePricingTables } from "@/services/pricing/pricingTableParser";

type Case = {
  name: string;
  path: string;
  expected: {
    minTables: number;
    mustContainTableName?: RegExp;
    mustNotContainItemName?: RegExp;
    mustHaveAlternatePrice?: number;
    expectedDocumentTotal?: number;
    minRespMatrixCategories?: number;
  };
};

const cases: Case[] = [
  {
    name: "NBCU",
    path: path.resolve(process.cwd(), "test-fixtures/pricing/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx"),
    expected: {
      minTables: 4,
      mustContainTableName: /live sync/i,
      mustNotContainItemName: /total project value|lg rebate/i,
      mustHaveAlternatePrice: -147085.71,
      expectedDocumentTotal: 1193303.47,
      minRespMatrixCategories: 1,
    },
  },
  {
    name: "Indiana Fever",
    path: path.resolve(process.cwd(), "test-fixtures/pricing/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx"),
    expected: {
      minTables: 8,
      mustContainTableName: /hall of excellence/i,
    },
  },
];

function runCase(c: Case) {
  assert.ok(fs.existsSync(c.path), `Missing workbook fixture: ${c.path}`);
  const wb = XLSX.readFile(c.path);
  const doc = parsePricingTables(wb, c.name);
  assert.ok(doc, `Parser returned null for ${c.name}`);
  const parsed = doc!;

  assert.ok(parsed.tables.length >= c.expected.minTables, `${c.name}: expected at least ${c.expected.minTables} tables, got ${parsed.tables.length}`);

  if (c.expected.mustContainTableName) {
    const has = parsed.tables.some((t) => c.expected.mustContainTableName!.test(t.name));
    assert.ok(has, `${c.name}: missing table matching ${c.expected.mustContainTableName}`);
  }

  if (c.expected.mustNotContainItemName) {
    for (const t of parsed.tables) {
      const bad = (t.items || []).find((i) => c.expected.mustNotContainItemName!.test(i.description || ""));
      assert.ok(!bad, `${c.name}: found forbidden item "${bad?.description}" in table "${t.name}"`);
    }
  }

  if (typeof c.expected.mustHaveAlternatePrice === "number") {
    const hasAlt = parsed.tables.some((t) =>
      (t.alternates || []).some((a) => Math.abs(a.priceDifference - c.expected.mustHaveAlternatePrice!) < 0.01)
    );
    assert.ok(hasAlt, `${c.name}: missing alternate price ${c.expected.mustHaveAlternatePrice}`);
  }

  if (typeof c.expected.expectedDocumentTotal === "number") {
    assert.ok(
      Math.abs(parsed.documentTotal - c.expected.expectedDocumentTotal) < 0.01,
      `${c.name}: document total mismatch. got=${parsed.documentTotal}, expected=${c.expected.expectedDocumentTotal}`
    );
  }

  if (typeof c.expected.minRespMatrixCategories === "number") {
    const categoryCount = parsed.respMatrix?.categories?.length || 0;
    assert.ok(
      categoryCount >= c.expected.minRespMatrixCategories,
      `${c.name}: expected at least ${c.expected.minRespMatrixCategories} Resp Matrix categories, got ${categoryCount}`
    );
  }
  console.log(`PASS: ${c.name}`);
}

function run() {
  for (const c of cases) runCase(c);
  console.log("PASS: pricing parser real-workbook suite");
}

run();
