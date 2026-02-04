import { NextRequest, NextResponse } from "next/server";
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
                // Attach pricingDocument to the response
                (data as any).pricingDocument = pricingDocument;
                console.log(`[EXCEL IMPORT] PricingDocument: ${pricingDocument.tables.length} tables, ${pricingDocument.documentTotal} total`);
            }
        } catch (pricingErr) {
            // Non-fatal - continue with existing data even if pricing parser fails
            console.warn("[EXCEL IMPORT] PricingTable parser warning:", pricingErr);
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error("Excel import error:", err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
