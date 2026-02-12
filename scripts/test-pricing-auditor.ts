/**
 * test-pricing-auditor.ts — Test Mr. Genie against real workbooks
 *
 * Usage: npx tsx scripts/test-pricing-auditor.ts
 */

import * as path from "path";
import * as XLSX from "xlsx";
import { parsePricingTablesWithValidation } from "@/services/pricing/pricingTableParser";
import { auditPricing, auditPricingSync } from "@/lib/pricingAuditor";

const workbooks = [
    { name: "NBCU (original)", path: "test-fixtures/pricing/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025.xlsx" },
    { name: "NBCU (v7)", path: ".ai-rules/Cost Analysis - NBCU 2025 Project - 9C - 10-30-2025 (7).xlsx" },
    { name: "Indiana Fever", path: "test-fixtures/pricing/Cost Analysis - Indiana Fever - 2026-01-22 (2).xlsx" },
    { name: "LA Dodgers", path: ".claude/LA Dodgers - 2026 Reserve Level Ribbons - Cost Analysis - JSR and DJC - 2025-12-11 EG (2).xlsx" },
    { name: "Cleveland Browns", path: ".ai-rules/Cleveland Browns - Huntington Bank Field - Cost Analysis - JOB - 2026-01-20 (1).xlsx" },
];

async function main() {
    console.log("\n═══════════════════════════════════════");
    console.log("  🧞 MR. GENIE — AI PRICING AUDITOR");
    console.log("═══════════════════════════════════════\n");

    let totalPassed = 0;
    let totalFailed = 0;

    for (const wb of workbooks) {
        const wbPath = path.resolve(process.cwd(), wb.path);
        console.log(`\n── ${wb.name} ──`);

        try {
            const xlsxWb = XLSX.readFile(wbPath);
            const { document } = parsePricingTablesWithValidation(xlsxWb, wb.name);
            if (!document) {
                console.error(`  ❌ SKIP: Parser returned null for ${wb.name}`);
                continue;
            }

            // Phase 1: Deterministic audit (fast, always works)
            const syncReport = auditPricingSync(document);
            console.log(`  Deterministic: ${syncReport.status} (${syncReport.confidence}% confidence)`);
            console.log(`  Tables: ${syncReport.tables.length}`);
            console.log(`  Document Total: Excel=$${syncReport.documentTotal.excel} → Computed=$${syncReport.documentTotal.computed} ${syncReport.documentTotal.match ? "✅" : "⚠️"}`);

            if (syncReport.warnings.length > 0) {
                console.log(`  Warnings (${syncReport.warnings.length}):`);
                syncReport.warnings.forEach(w => console.log(`    ⚠️  ${w}`));
            }

            // Deterministic should pass for all real workbooks
            if (syncReport.status === "FAIL") {
                console.error(`  ❌ FAIL: Deterministic audit FAILED for ${wb.name}`);
                totalFailed++;
            } else {
                console.log(`  ✅ PASS: Deterministic audit`);
                totalPassed++;
            }

            // Phase 2: AI audit (calls ZhipuAI — one call to test the integration)
            if (wb.name === "NBCU (original)") {
                console.log(`\n  🧞 Calling AI assessment for ${wb.name}...`);
                const fullReport = await auditPricing(document);
                console.log(`  AI Assessment:`);
                console.log(`    ${fullReport.aiAssessment.split("\n").join("\n    ")}`);
                console.log(`  Full Report: ${fullReport.status} (${fullReport.confidence}%)`);
            }

        } catch (err: any) {
            console.error(`  ❌ ERROR: ${err.message}`);
            totalFailed++;
        }
    }

    console.log("\n═══════════════════════════════════════");
    console.log(`  RESULTS: ${totalPassed} passed, ${totalFailed} failed`);
    console.log("═══════════════════════════════════════\n");

    if (totalFailed > 0) process.exit(1);
}

main().catch(err => {
    console.error("Fatal:", err);
    process.exit(1);
});
