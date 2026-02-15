import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { parseANCExcel } from "@/services/proposal/server/excelImportService";
import { parsePricingTablesWithValidation, PRICING_PARSER_STRICT_VERSION } from "@/services/pricing/pricingTableParser";
import { normalizeExcel } from "@/services/import/excelNormalizer";
import * as xlsx from "xlsx";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Parse with existing service (for backwards compatibility)
        const data = await parseANCExcel(buffer, file.name);

        // NEW: Also parse with PricingTable parser for Natalia Mirror Mode
        try {
            const workbook = xlsx.read(buffer, { type: "buffer" });
            const sourceWorkbookHash = crypto.createHash("sha256").update(buffer).digest("hex");
            const { document: pricingDocument, validation } = parsePricingTablesWithValidation(workbook, file.name, {
                strict: true,
                sourceWorkbookHash,
            });

            if (validation.status === "FAIL" || !pricingDocument) {
                const respCandidates = validation?.evidence?.respMatrixSheetCandidates || [];
                const hasRespHint = respCandidates.length > 0 || validation.errors.some((e) => /resp matrix/i.test(e));
                const message = hasRespHint
                    ? "We couldn't read the Responsibility Matrix from this Excel. If your file includes one, make sure the sheet name starts with 'Resp Matrix' and includes ANC/Purchaser columns."
                    : "We couldn't read the pricing tables from this Excel. Please confirm the workbook has a valid Margin Analysis tab with Description, Cost, and Selling Price columns.";
                return NextResponse.json({
                    error: message,
                    help: [
                        "Check that the Margin Analysis tab exists and has standard pricing columns.",
                        "If using a Responsibility Matrix, verify the tab name starts with 'Resp Matrix'.",
                        "Upload the corrected file again.",
                    ],
                }, { status: 422 });
            }

            if (pricingDocument && pricingDocument.tables.length > 0) {
                // Attach pricingDocument to the response inside details so it persists
                if (data.formData && data.formData.details) {
                    (data.formData.details as any).pricingDocument = pricingDocument;
                    (data.formData.details as any).parserValidationReport = validation;
                    (data.formData.details as any).parserStrictVersion = PRICING_PARSER_STRICT_VERSION;
                    (data.formData.details as any).sourceWorkbookHash = sourceWorkbookHash;

                    // REQ-127: Backfill screen.group if missing by correlating with Pricing Tables
                    // This ensures the link between Screens (LED Sheet) and Tables (Margin Analysis) is robust
                    // even if the excelImportService's fuzzy matcher missed the section header.
                    const screens = (data.formData.details.screens as any[]) || [];
                    const tables = pricingDocument.tables;

                    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").trim();

                    screens.forEach(screen => {
                        if (!screen.group) {
                            const sName = norm(screen.name);
                            // Find table with matching name (fuzzy)
                            const match = tables.find(t => {
                                const tName = norm(t.name);
                                return tName.includes(sName) || sName.includes(tName);
                            });

                            if (match) {
                                screen.group = match.name;
                                console.log(`[EXCEL IMPORT] Backfilled group for screen "${screen.name}" -> "${match.name}"`);
                            }
                        }
                    });
                }
                console.log(`[EXCEL IMPORT] PricingDocument: ${pricingDocument.tables.length} tables, ${pricingDocument.documentTotal} total`);
                (data as any).validation = validation;
            }
        } catch (pricingErr) {
            Sentry.captureException(pricingErr, { tags: { area: "pricingTableParser" } });
            console.warn("[EXCEL IMPORT] PricingTable parser warning:", pricingErr);
        }

        return NextResponse.json(data);
    } catch (err) {
        // Standard parsers failed — try the Frankenstein normalizer as fallback
        console.warn("[EXCEL IMPORT] Standard parser failed, trying normalizer:", String(err));
        try {
            const fallbackFormData = await req.clone().formData();
            const fallbackFile = fallbackFormData.get("file") as File;
            if (fallbackFile) {
                const fallbackBuffer = Buffer.from(await fallbackFile.arrayBuffer());
                const normResult = await normalizeExcel(fallbackBuffer, fallbackFile.name);

                if (normResult.status === "success") {
                    // Profile matched — return extracted data with a flag
                    return NextResponse.json({
                        ...normResult,
                        normalizedImport: true,
                    });
                }

                // No profile — return 202 so frontend shows the Mapping Wizard
                return NextResponse.json({
                    ...normResult,
                    normalizedImport: true,
                    originalError: String(err),
                }, { status: 202 });
            }
        } catch (normErr) {
            Sentry.captureException(normErr, { tags: { area: "excelNormalizerFallback" } });
            console.error("[EXCEL IMPORT] Normalizer fallback also failed:", normErr);
        }

        // Both parsers failed — return the original error
        Sentry.captureException(err, { tags: { area: "excelImport" } });
        console.error("Excel import error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
