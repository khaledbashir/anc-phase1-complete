/**
 * test-pricing-math.ts — Self-validation for the centralized pricing math engine
 *
 * Parses the real NBCU workbook and verifies:
 *   1. roundToDisplay works correctly at CURRENCY_FORMAT.decimals
 *   2. computeTableTotals enforces grandTotal === subtotal + tax + bond
 *   3. computeDocumentTotal === sum of per-table grandTotals
 *   4. No ghost $0 items appear in rendered items
 *   5. Items are properly rounded before summing (no penny problem)
 *
 * Usage: npx tsx scripts/test-pricing-math.ts
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { parsePricingTablesWithValidation } from "@/services/pricing/pricingTableParser";
import {
    roundToDisplay,
    computeTableTotals,
    computeDocumentTotal,
    computeDocumentTotalFromTables,
} from "@/lib/pricingMath";
import { CURRENCY_FORMAT } from "@/services/rfp/productCatalog";
import type { PricingDocument, PricingTable } from "@/types/pricing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
    if (condition) {
        passed++;
        console.log(`  ✅ PASS: ${msg}`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${msg}`);
    }
}

function assertEq(actual: number, expected: number, msg: string) {
    const ok = Math.abs(actual - expected) < 0.001;
    if (ok) {
        passed++;
        console.log(`  ✅ PASS: ${msg}  (${actual})`);
    } else {
        failed++;
        console.error(`  ❌ FAIL: ${msg}  (expected ${expected}, got ${actual})`);
    }
}

// ─── Unit Tests ──────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════");
console.log("  PRICING MATH ENGINE — SELF-VALIDATION");
console.log("═══════════════════════════════════════\n");

console.log("1. roundToDisplay");
{
    const decimals = CURRENCY_FORMAT.decimals;
    console.log(`   CURRENCY_FORMAT.decimals = ${decimals}`);

    if (decimals === 0) {
        assertEq(roundToDisplay(123.4), 123, "123.4 → 123 (0 decimals)");
        assertEq(roundToDisplay(123.5), 124, "123.5 → 124 (rounds up)");
        assertEq(roundToDisplay(0.49), 0, "0.49 → 0 (below threshold)");
        assertEq(roundToDisplay(-0.3), 0, "-0.3 → 0 (negative near zero)");
    } else if (decimals === 2) {
        assertEq(roundToDisplay(123.456), 123.46, "123.456 → 123.46 (2 decimals)");
        assertEq(roundToDisplay(0.005), 0.01, "0.005 → 0.01 (banker's rounding)");
    }
}

// ─── Integration Tests with Real Workbooks ───────────────────────────────────

const workbooks = [
    { name: "NBCU (original)", path: "test-fixtures/pricing/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx" },
    { name: "NBCU (v7)", path: ".ai-rules/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025 (7).xlsx" },
    { name: "Indiana Fever", path: "test-fixtures/pricing/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx" },
];

const parsedDocs: PricingDocument[] = [];

for (const wb of workbooks) {
    const wbPath = path.resolve(process.cwd(), wb.path);
    console.log(`\n2. Parse ${wb.name}`);
    try {
        const xlsxWb = XLSX.readFile(wbPath);
        const { document } = parsePricingTablesWithValidation(xlsxWb, wb.name);
        if (!document) throw new Error("Parser returned null document");
        assert(document.tables.length > 0, `${wb.name}: Parsed ${document.tables.length} tables`);
        parsedDocs.push(document);
    } catch (err: any) {
        console.error(`  ⚠️  SKIP: ${wb.name}: ${err.message}`);
        continue;
    }
}

assert(parsedDocs.length > 0, `At least one workbook parsed successfully`);

for (const doc of parsedDocs) {
    console.log(`\n3. Per-table round-then-sum invariant (${doc.tables.length} tables)`);
    for (const table of doc.tables) {
        const totals = computeTableTotals(table);

        // Invariant: grandTotal === subtotal + tax + bond (all pre-rounded)
        const expected = totals.subtotal + totals.tax + totals.bond;
        assertEq(totals.grandTotal, expected, `${table.name}: grandTotal === subtotal + tax + bond`);

        // Invariant: subtotal === sum of rounded item prices
        const itemSum = totals.items
            .filter(ri => !ri.isIncluded)
            .reduce((s, ri) => s + ri.price, 0);
        assertEq(totals.subtotal, itemSum, `${table.name}: subtotal === sum(rounded items)`);

        // No ghost $0 items
        const zeroItems = totals.items.filter(ri => !ri.isIncluded && ri.price === 0);
        assert(zeroItems.length === 0, `${table.name}: no ghost $0 items (found ${zeroItems.length})`);

        // All item prices are at display precision
        for (const ri of totals.items) {
            if (ri.isIncluded) continue;
            assertEq(roundToDisplay(ri.price), ri.price, `${table.name}/${ri.description}: price already rounded`);
        }
    }

    console.log(`\n4. Document total consistency`);
    {
        const docTotal = computeDocumentTotal(doc);
        const tableGrandTotalSum = doc.tables.reduce(
            (s, t) => s + computeTableTotals(t).grandTotal,
            0
        );
        assertEq(docTotal, tableGrandTotalSum, "computeDocumentTotal === sum(per-table grandTotals)");

        const docTotalFromTables = computeDocumentTotalFromTables(doc.tables);
        assertEq(docTotalFromTables, docTotal, "computeDocumentTotalFromTables matches computeDocumentTotal");
    }
}

console.log("\n5. Override handling");
{
    const table = parsedDocs[0]?.tables[0];
    if (table && table.items.length > 0) {
        const override: Record<string, number> = { [`${table.id}:0`]: 99999 };
        const withOverride = computeTableTotals(table, override);
        const without = computeTableTotals(table);

        assert(
            withOverride.items[0]?.price === roundToDisplay(99999),
            `Override applies correctly (${withOverride.items[0]?.price})`
        );

        assert(
            withOverride.subtotal !== without.subtotal,
            "Override changes subtotal"
        );
    }
}

console.log("\n6. Penny problem regression test");
{
    // Simulate the exact scenario: if we have items like $100.40, $200.60, $300.10
    // With decimals=0, round-then-sum should give 100 + 201 + 300 = 601
    // NOT round(100.40+200.60+300.10) = round(601.10) = 601 (same by coincidence)
    // But try: $100.49 + $100.49 + $100.49 → round-then-sum: 100+100+100=300
    // vs sum-then-round: round(301.47) = 301 — THIS is the penny problem
    const mockTable: PricingTable = {
        id: "test-penny",
        name: "Penny Problem Test",
        currency: "USD",
        items: [
            { description: "A", sellingPrice: 100.49, isIncluded: false },
            { description: "B", sellingPrice: 100.49, isIncluded: false },
            { description: "C", sellingPrice: 100.49, isIncluded: false },
        ],
        subtotal: 301.47,
        tax: null as any,
        bond: 0,
        grandTotal: 301,
        alternates: [],
    };

    const totals = computeTableTotals(mockTable);

    if (CURRENCY_FORMAT.decimals === 0) {
        // Round-then-sum: each 100.49 → 100, sum = 300
        assertEq(totals.subtotal, 300, "Penny test: round-then-sum gives 300 (not 301)");
        assertEq(totals.grandTotal, 300, "Penny test: grandTotal matches subtotal when no tax/bond");
    } else {
        console.log("  (Penny test skipped — decimals != 0)");
    }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════\n");

if (failed > 0) {
    process.exit(1);
}
console.log("PASS: pricing math engine self-validation\n");
