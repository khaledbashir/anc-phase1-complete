export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { transformProposalToJsreport } from "@/services/proposal/server/transformProposalToJsreport";
import { JSREPORT_URL, JSREPORT_USER, JSREPORT_PASSWORD } from "@/lib/variables";

/**
 * POST /api/proposal/generate-jsreport
 *
 * Receives the same ProposalType payload as the Puppeteer route,
 * transforms it, and sends it to the jsreport container for PDF generation.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const jsreportData = transformProposalToJsreport(body);

        const jsreportPayload = {
            template: { name: "ANC-Proposal" },
            data: jsreportData,
        };

        console.log(`[jsreport] Sending request to ${JSREPORT_URL}/api/report`);

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        // Add basic auth if credentials are configured
        if (JSREPORT_USER && JSREPORT_PASSWORD) {
            const credentials = Buffer.from(`${JSREPORT_USER}:${JSREPORT_PASSWORD}`).toString("base64");
            headers["Authorization"] = `Basic ${credentials}`;
        }

        const response = await fetch(`${JSREPORT_URL}/api/report`, {
            method: "POST",
            headers,
            body: JSON.stringify(jsreportPayload),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[jsreport] Error response:", response.status, errorText);
            return NextResponse.json(
                {
                    error: "jsreport PDF generation failed",
                    details: errorText,
                    status: response.status,
                },
                { status: 502 },
            );
        }

        const pdfBuffer = await response.arrayBuffer();

        if (pdfBuffer.byteLength === 0) {
            return NextResponse.json(
                { error: "jsreport returned empty PDF" },
                { status: 502 },
            );
        }

        console.log(`[jsreport] PDF generated: ${pdfBuffer.byteLength} bytes`);

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=proposal-jsreport.pdf",
                "Cache-Control": "no-cache",
                Pragma: "no-cache",
            },
            status: 200,
        });
    } catch (error: any) {
        console.error("[jsreport] Unhandled error:", error);
        return NextResponse.json(
            {
                error: "Failed to generate PDF via jsreport",
                details: error?.message || String(error),
            },
            { status: 500 },
        );
    }
}
