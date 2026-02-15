/**
 * /api/vendor/parse — Parse vendor spec sheet (PDF or Excel)
 *
 * POST: Upload a vendor file, extract LED specs.
 * Accepts multipart/form-data with a single file.
 */

import { NextRequest, NextResponse } from "next/server";
import { extractFromExcel, extractFromText } from "@/services/vendor/vendorParser";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const fileName = file.name.toLowerCase();
        const buffer = Buffer.from(await file.arrayBuffer());

        // Determine file type and extract
        if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls") || fileName.endsWith(".csv")) {
            const spec = extractFromExcel(buffer);
            return NextResponse.json({
                spec,
                fileName: file.name,
                fileType: "excel",
            });
        }

        if (fileName.endsWith(".pdf")) {
            // Extract text from PDF using unpdf (same lib used by RFP extractor)
            let text = "";
            try {
                const { extractText } = await import("unpdf");
                const result = await extractText(new Uint8Array(buffer));
                // unpdf returns text as string[] (per page) — join them
                const pages = result.text;
                text = Array.isArray(pages) ? pages.join("\n") : String(pages || "");
            } catch {
                // Fallback: try pdf-parse
                try {
                    const pdfParseModule = await import("pdf-parse");
                    const pdfParse = pdfParseModule.default || pdfParseModule;
                    const parsed = await (pdfParse as any)(buffer);
                    text = parsed.text || "";
                } catch {
                    return NextResponse.json(
                        { error: "Could not extract text from PDF. Try an Excel file instead." },
                        { status: 422 }
                    );
                }
            }

            if (!text.trim()) {
                return NextResponse.json(
                    { error: "PDF appears to be image-only (no extractable text). Try an Excel file instead." },
                    { status: 422 }
                );
            }

            const spec = extractFromText(text);
            return NextResponse.json({
                spec,
                fileName: file.name,
                fileType: "pdf",
            });
        }

        // Plain text fallback
        if (fileName.endsWith(".txt") || fileName.endsWith(".csv")) {
            const text = buffer.toString("utf-8");
            const spec = extractFromText(text);
            return NextResponse.json({
                spec,
                fileName: file.name,
                fileType: "text",
            });
        }

        return NextResponse.json(
            { error: "Unsupported file type. Upload a PDF, Excel (.xlsx/.xls), or text file." },
            { status: 400 }
        );
    } catch (error) {
        console.error("[vendor/parse] Error:", error);
        return NextResponse.json(
            { error: "Failed to parse vendor file" },
            { status: 500 }
        );
    }
}
