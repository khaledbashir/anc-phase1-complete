/**
 * debug-dodgers.ts — Debug script for LA Dodgers pricing discrepancy
 *
 * Usage: npx tsx scripts/debug-dodgers.ts
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { parsePricingTablesWithValidation } from "@/services/pricing/pricingTableParser";
import { computeTableTotals } from "@/lib/pricingMath";

const WB_PATH = ".claude/LA Dodgers - 2026 Reserve Level Ribbons - Cost Analysis - JSR and DJC - 2025-12-11 EG (2).xlsx";

async function main() {
    console.log("Reading workbook:", WB_PATH);
    const wb = XLSX.readFile(path.resolve(process.cwd(), WB_PATH));

    console.log("Parsing...");
    const { document, validation } = parsePricingTablesWithValidation(wb, "LA Dodgers");

    if (!document) {
        console.error("Parser returned null document");
        process.exit(1);
    }

    console.log(`Parsed ${document.tables.length} tables.`);
    console.log(`Excel Document Total: $${document.documentTotal?.toLocaleString()}`);

    let computedDocTotal = 0;

    for (const table of document.tables) {
        const totals = computeTableTotals(table);
        console.log(`\nTable: "${table.name}"`);
        console.log(`  Items: ${table.items.length} (Excel) / ${totals.items.length} (Rendered)`);

        // Inspect Tax
        const excelTax = typeof table.tax === 'object' ? table.tax?.amount ?? 0 : table.tax ?? 0;
        const excelSubtotal = table.subtotal ?? 0;
        const derivedRate = excelSubtotal > 0 ? excelTax / excelSubtotal : 0;

        console.log(`  Excel Subtotal: $${excelSubtotal.toLocaleString()}`);
        console.log(`  Excel Tax Amt:  $${excelTax.toLocaleString()}`);
        console.log(`  Derived Rate:   ${(derivedRate * 100).toFixed(4)}%`);
        console.log(`  Calc Tax Amt:   $${totals.tax.toLocaleString()}`);

        console.log(`  Excel Grand:    $${table.grandTotal?.toLocaleString()}`);
        console.log(`  Calc  Grand:    $${totals.grandTotal.toLocaleString()}`);

        computedDocTotal += totals.grandTotal;
    }

    console.log(`\nComputed Document Total: $${computedDocTotal.toLocaleString()}`);
    console.log(`Difference: $${(computedDocTotal - (document.documentTotal || 0)).toLocaleString()}`);
}

main().catch(console.error);
