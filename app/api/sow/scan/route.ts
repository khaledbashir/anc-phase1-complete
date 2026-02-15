import { NextRequest, NextResponse } from "next/server";
import { scanForLiabilities } from "@/services/sow/liabilityScanner";

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get("content-type") || "";

        let text = "";
        let documentName = "Unknown Document";

        if (contentType.includes("multipart/form-data")) {
            const formData = await request.formData();
            const file = formData.get("file") as File | null;

            if (!file) {
                return NextResponse.json(
                    { error: "No file provided" },
                    { status: 400 }
                );
            }

            documentName = file.name;
            const fileName = file.name.toLowerCase();
            const buffer = Buffer.from(await file.arrayBuffer());

            if (fileName.endsWith(".pdf")) {
                try {
                    const { extractText } = await import("unpdf");
                    const result = await extractText(new Uint8Array(buffer));
                    const pages = result.text;
                    text = Array.isArray(pages)
                        ? pages.join("\n")
                        : String(pages || "");
                } catch {
                    try {
                        const pdfParseModule = await import("pdf-parse");
                        const pdfParse =
                            pdfParseModule.default || pdfParseModule;
                        const parsed = await (pdfParse as any)(buffer);
                        text = parsed.text || "";
                    } catch {
                        return NextResponse.json(
                            {
                                error: "Could not extract text from PDF. Try a text file instead.",
                            },
                            { status: 422 }
                        );
                    }
                }
            } else if (
                fileName.endsWith(".txt") ||
                fileName.endsWith(".md") ||
                fileName.endsWith(".docx")
            ) {
                text = buffer.toString("utf-8");
            } else {
                return NextResponse.json(
                    {
                        error: "Unsupported file type. Upload a PDF, TXT, or DOCX file.",
                    },
                    { status: 400 }
                );
            }
        } else {
            // JSON body with { text, documentName }
            const body = await request.json();
            text = body.text || "";
            documentName = body.documentName || "Pasted Text";
        }

        if (!text.trim()) {
            return NextResponse.json(
                { error: "No text content to scan" },
                { status: 400 }
            );
        }

        const result = scanForLiabilities(text, documentName);

        return NextResponse.json({ result });
    } catch (error) {
        console.error("[sow/scan] POST error:", error);
        return NextResponse.json(
            { error: "Failed to scan document" },
            { status: 500 }
        );
    }
}
