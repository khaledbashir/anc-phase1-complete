/**
 * pricingAuditor.ts — "Mr. Genie" AI Pricing Auditor
 *
 * Read-only AI verification layer that cross-references Excel source data
 * against pricingMath.ts computed values and produces a structured confidence report.
 *
 * NEVER modifies any dollar values — purely read + compare + report.
 *
 * Uses ZhipuAI (glm-5) for the verification assessment.
 */

import type { PricingDocument, PricingTable } from "@/types/pricing";
import { computeTableTotals, computeDocumentTotal, roundToDisplay } from "@/lib/pricingMath";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuditReport {
    confidence: number;                // 0–100
    status: "PASS" | "WARN" | "FAIL";
    tables: AuditTableResult[];
    documentTotal: {
        excel: number;
        computed: number;
        match: boolean;
    };
    summary: string;                   // human-readable 1-liner
    warnings: string[];
    aiAssessment: string;              // raw AI response for transparency
    timestamp: string;
}

export interface AuditTableResult {
    tableName: string;
    itemCount: { excel: number; rendered: number; filtered: number };
    subtotal: { excel: number; computed: number; delta: number; match: boolean };
    tax: { excel: number; computed: number; delta: number; match: boolean };
    bond: { excel: number; computed: number; match: boolean };
    grandTotal: { excel: number; computed: number; delta: number; match: boolean };
    items: AuditItemResult[];
    warnings: string[];
}

export interface AuditItemResult {
    description: string;
    excelPrice: number;
    computedPrice: number;
    match: boolean;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const ZHIPU_ENDPOINT = "https://api.z.ai/api/coding/paas/v4/";
const ZHIPU_API_KEY = "1b8d0a838b9847af97f00489572a7067.w4P5rwLLI1GBbwcb";
const ZHIPU_MODEL = "glm-5";

// ─── Thresholds ──────────────────────────────────────────────────────────────
// Small deltas between Excel (sum-then-round) and our engine (round-then-sum)
// are EXPECTED and intentional. These thresholds define what's acceptable.

const ROUNDING_TOLERANCE = 5;     // $5 per table — expected round-then-sum variance
const CRITICAL_THRESHOLD = 10;    // $10 — anything above this is a real concern
const DOC_TOTAL_TOLERANCE_PER_TABLE = 3; // $3 per table for document-level tolerance

// ─── Deterministic Pre-Check ─────────────────────────────────────────────────
// Run ALL comparisons deterministically FIRST. The AI only reviews the report.

function buildDeterministicReport(
    doc: PricingDocument,
    priceOverrides: Record<string, number> = {},
    descriptionOverrides: Record<string, string> = {},
): Omit<AuditReport, "aiAssessment"> {
    const tableResults: AuditTableResult[] = [];
    const allWarnings: string[] = [];

    for (const table of doc.tables) {
        const totals = computeTableTotals(table, priceOverrides, descriptionOverrides);
        const tableWarnings: string[] = [];

        // Compare item counts
        const excelItemCount = (table.items || []).length;
        const renderedCount = totals.items.length;
        const filteredCount = excelItemCount - renderedCount;

        if (filteredCount > 0) {
            tableWarnings.push(`${filteredCount} item(s) filtered ($0 or negligible price)`);
        }

        // Compare per-item prices
        const itemResults: AuditItemResult[] = [];
        for (const ri of totals.items) {
            const excelItem = table.items[ri.originalIndex];
            const excelPrice = roundToDisplay(Number(excelItem?.sellingPrice ?? 0));
            const match = Math.abs(excelPrice - ri.price) < 0.01;
            if (!match) {
                tableWarnings.push(
                    `Item "${ri.description}": Excel=$${excelPrice}, Computed=$${ri.price}`
                );
            }
            itemResults.push({
                description: ri.description,
                excelPrice,
                computedPrice: ri.price,
                match,
            });
        }

        // Compare subtotal
        const excelSubtotal = roundToDisplay(Number(table.subtotal ?? 0));
        const subtotalDelta = totals.subtotal - excelSubtotal;
        const subtotalMatch = Math.abs(subtotalDelta) <= ROUNDING_TOLERANCE;

        if (Math.abs(subtotalDelta) > CRITICAL_THRESHOLD) {
            tableWarnings.push(
                `Subtotal concern: Excel=$${excelSubtotal}, Computed=$${totals.subtotal} (Δ$${subtotalDelta})`
            );
        }

        // Compare tax
        const excelTax = roundToDisplay(
            typeof table.tax === "object" ? Number(table.tax?.amount ?? 0) : Number(table.tax ?? 0)
        );
        const taxDelta = totals.tax - excelTax;
        const taxMatch = Math.abs(taxDelta) <= ROUNDING_TOLERANCE;

        if (Math.abs(taxDelta) > CRITICAL_THRESHOLD) {
            tableWarnings.push(
                `Tax concern: Excel=$${excelTax}, Computed=$${totals.tax} (Δ$${taxDelta})`
            );
        }

        // Compare bond
        const excelBond = roundToDisplay(Number(table.bond ?? 0));
        const bondMatch = Math.abs(excelBond - totals.bond) < 0.01;

        // Compare grandTotal
        const excelGrand = roundToDisplay(Number(table.grandTotal ?? 0));
        const grandDelta = totals.grandTotal - excelGrand;
        const grandMatch = Math.abs(grandDelta) <= ROUNDING_TOLERANCE;

        if (Math.abs(grandDelta) > CRITICAL_THRESHOLD) {
            tableWarnings.push(
                `Grand total concern: Excel=$${excelGrand}, Computed=$${totals.grandTotal} (Δ$${grandDelta})`
            );
        }

        if (tableWarnings.length > 0) {
            allWarnings.push(...tableWarnings.map(w => `[${table.name}] ${w}`));
        }

        tableResults.push({
            tableName: table.name,
            itemCount: { excel: excelItemCount, rendered: renderedCount, filtered: filteredCount },
            subtotal: { excel: excelSubtotal, computed: totals.subtotal, delta: subtotalDelta, match: subtotalMatch },
            tax: { excel: excelTax, computed: totals.tax, delta: taxDelta, match: taxMatch },
            bond: { excel: excelBond, computed: totals.bond, match: bondMatch },
            grandTotal: { excel: excelGrand, computed: totals.grandTotal, delta: grandDelta, match: grandMatch },
            items: itemResults,
            warnings: tableWarnings,
        });
    }

    // Document total
    const excelDocTotal = roundToDisplay(Number(doc.documentTotal ?? 0));
    const computedDocTotal = computeDocumentTotal(doc, priceOverrides, descriptionOverrides);
    const docTotalTolerance = doc.tables.length * DOC_TOTAL_TOLERANCE_PER_TABLE;
    const docTotalDelta = Math.abs(excelDocTotal - computedDocTotal);
    const docTotalMatch = docTotalDelta <= docTotalTolerance;

    if (docTotalDelta > CRITICAL_THRESHOLD * doc.tables.length) {
        allWarnings.push(
            `Document total concern: Excel=$${excelDocTotal}, Computed=$${computedDocTotal} (Δ$${docTotalDelta})`
        );
    }

    // Determine status
    // FAIL only for genuine concerns (> CRITICAL_THRESHOLD)
    // WARN for minor warnings (filtered items, etc)
    // PASS when everything is clean or only has expected rounding variance
    const criticalWarnings = allWarnings.filter(w => w.includes("concern"));
    const minorWarnings = allWarnings.filter(w => !w.includes("concern"));

    const status: "PASS" | "WARN" | "FAIL" =
        criticalWarnings.length > 0 ? "FAIL" :
            minorWarnings.length > 0 ? "WARN" : "PASS";

    // Confidence: 100 = perfect, deduct for real concerns only
    const confidence = Math.max(
        0,
        100
        - criticalWarnings.length * 20
        - minorWarnings.length * 2
    );

    const itemTotal = tableResults.reduce((s, t) => s + t.itemCount.rendered, 0);
    const summary =
        status === "PASS"
            ? `All ${doc.tables.length} tables verified. ${itemTotal} items, $${computedDocTotal.toLocaleString()} total. No discrepancies.`
            : status === "WARN"
                ? `${doc.tables.length} tables verified with ${minorWarnings.length} minor note(s). $${computedDocTotal.toLocaleString()} total.`
                : `${criticalWarnings.length} concern(s) found across ${doc.tables.length} tables. Review required.`;

    return {
        confidence,
        status,
        tables: tableResults,
        documentTotal: {
            excel: excelDocTotal,
            computed: computedDocTotal,
            match: docTotalMatch,
        },
        summary,
        warnings: allWarnings,
        timestamp: new Date().toISOString(),
    };
}

// ─── AI Assessment Layer ─────────────────────────────────────────────────────

function buildAuditPrompt(report: Omit<AuditReport, "aiAssessment">): string {
    const tableRows = report.tables.map(t => {
        const itemLines = t.items.map(i =>
            `  - ${i.description}: Excel=$${i.excelPrice} → PDF=$${i.computedPrice} ${i.match ? "✅" : "⚠️"}`
        ).join("\n");

        return `TABLE: "${t.tableName}"
Items: ${t.itemCount.excel} Excel → ${t.itemCount.rendered} rendered (${t.itemCount.filtered} filtered)
${itemLines}
  Subtotal: Excel=$${t.subtotal.excel} → Computed=$${t.subtotal.computed} ${t.subtotal.match ? "✅" : `⚠️ Δ$${t.subtotal.delta}`}
  Tax: Excel=$${t.tax.excel} → Computed=$${t.tax.computed} ${t.tax.match ? "✅" : `⚠️ Δ$${t.tax.delta}`}
  Bond: Excel=$${t.bond.excel} → Computed=$${t.bond.computed} ${t.bond.match ? "✅" : "⚠️"}
  Grand Total: Excel=$${t.grandTotal.excel} → Computed=$${t.grandTotal.computed} ${t.grandTotal.match ? "✅" : `⚠️ Δ$${t.grandTotal.delta}`}
  Warnings: ${t.warnings.length === 0 ? "None" : t.warnings.join("; ")}`;
    }).join("\n\n");

    return `You are Mr. Genie, the AI auditor for ANC Sports LED display proposals.
Your job: review this pricing comparison report (Excel source vs PDF computed) and provide a professional assessment.

IMPORTANT: You do NOT calculate any numbers. All comparisons are pre-computed.
Your job is to read the comparison, identify any concerns, and explain them clearly.

Small deltas ($1-$2) between Excel and computed values are EXPECTED due to our "round-then-sum" strategy
(we round each line item to display precision before summing, which intentionally differs from Excel's sum-then-round approach).
This is a FEATURE, not a bug. Only flag deltas > $5 per table as concerning.

Document Total: Excel=$${report.documentTotal.excel} → Computed=$${report.documentTotal.computed} ${report.documentTotal.match ? "✅" : "⚠️"}

${tableRows}

Overall Warnings: ${report.warnings.length === 0 ? "None" : report.warnings.join("; ")}

Respond with a brief professional assessment (2-4 sentences). Be specific about any concerns.
End with a confidence verdict: "CONFIDENCE: [HIGH/MEDIUM/LOW]"`;
}

async function getAIAssessment(prompt: string): Promise<string> {
    try {
        const response = await fetch(`${ZHIPU_ENDPOINT}chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ZHIPU_API_KEY}`,
            },
            body: JSON.stringify({
                model: ZHIPU_MODEL,
                messages: [
                    {
                        role: "system",
                        content: "You are Mr. Genie, a meticulous financial auditor for ANC Sports LED display proposals. You review pre-computed pricing comparisons and provide clear, professional assessments. Be concise and specific.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.1,    // low creativity — we want consistency
                max_tokens: 500,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[MR. GENIE] API error:", response.status, errorText);
            return `AI assessment unavailable (HTTP ${response.status}). Deterministic checks completed independently.`;
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;
        return content || "AI assessment unavailable. Deterministic checks completed independently.";
    } catch (error: any) {
        console.error("[MR. GENIE] Network error:", error.message);
        return `AI assessment unavailable (${error.message}). Deterministic checks completed independently.`;
    }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the full Mr. Genie audit on a PricingDocument.
 *
 * Phase 1: Deterministic comparison (always runs, always reliable)
 * Phase 2: AI assessment (best-effort, graceful degradation)
 *
 * @param doc The parsed PricingDocument from Excel
 * @param priceOverrides Optional price overrides from the editor
 * @param descriptionOverrides Optional description overrides from the editor
 */
export async function auditPricing(
    doc: PricingDocument,
    priceOverrides: Record<string, number> = {},
    descriptionOverrides: Record<string, string> = {},
): Promise<AuditReport> {
    // Phase 1: Deterministic — this ALWAYS works
    const report = buildDeterministicReport(doc, priceOverrides, descriptionOverrides);

    // Phase 2: AI assessment — best-effort, never blocks
    const prompt = buildAuditPrompt(report);
    const aiAssessment = await getAIAssessment(prompt);

    return {
        ...report,
        aiAssessment,
    };
}

/**
 * Run ONLY the deterministic audit (no AI call).
 * Useful for testing and for cases where the API is unavailable.
 */
export function auditPricingSync(
    doc: PricingDocument,
    priceOverrides: Record<string, number> = {},
    descriptionOverrides: Record<string, string> = {},
): Omit<AuditReport, "aiAssessment"> {
    return buildDeterministicReport(doc, priceOverrides, descriptionOverrides);
}
