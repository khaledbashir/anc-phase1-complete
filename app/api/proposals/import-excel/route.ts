import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { parseANCExcel } from "@/services/proposal/server/excelImportService";
import { parsePricingTables } from "@/services/pricing/pricingTableParser";
import * as xlsx from "xlsx";

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
            const pricingDocument = parsePricingTables(workbook, file.name);

            if (pricingDocument && pricingDocument.tables.length > 0) {
                // Attach pricingDocument to the response inside details so it persists
                if (data.formData && data.formData.details) {
                    (data.formData.details as any).pricingDocument = pricingDocument;

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
            }
        } catch (pricingErr) {
            Sentry.captureException(pricingErr, { tags: { area: "pricingTableParser" } });
            console.warn("[EXCEL IMPORT] PricingTable parser warning:", pricingErr);
        }

        return NextResponse.json(data);
    } catch (err) {
        Sentry.captureException(err, { tags: { area: "excelImport" } });
        console.error("Excel import error:", err);
        const rawError = String(err || "");
        const normalizedError = /margin\s*analysis/i.test(rawError)
            ? "No Margin Analysis sheet in here. Wrong workbook?"
            : rawError;
        return NextResponse.json({ error: normalizedError }, { status: 500 });
    }
}
