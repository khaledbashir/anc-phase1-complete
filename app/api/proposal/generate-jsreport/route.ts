export const runtime = "nodejs";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { JSREPORT_URL, JSREPORT_USER, JSREPORT_PASSWORD } from "@/lib/variables";
import { getProposalTemplate } from "@/lib/helpers";
import { sanitizeForClient } from "@/lib/security/sanitizeForClient";
import type { ProposalType } from "@/types";

function getRequestOrigin(req: NextRequest): string {
    const xfProto = req.headers.get("x-forwarded-proto");
    const xfHost = req.headers.get("x-forwarded-host");
    const host = xfHost || req.headers.get("host");
    const proto = (xfProto || req.nextUrl.protocol.replace(":", "") || "http").split(",")[0].trim() || "http";
    if (host) {
        const cleanHost = host.split(",")[0].trim();
        return `${proto}://${cleanHost}`;
    }
    return req.nextUrl.origin;
}

/**
 * POST /api/proposal/generate-jsreport
 *
 * Receives the same ProposalType payload as the Puppeteer route,
 * renders the same React template, then sends that HTML to jsreport chrome-pdf.
 * This keeps both export engines while aligning visual output.
 */
export async function POST(req: NextRequest) {
    try {
        const body = (await req.json()) as ProposalType;
        const ReactDOMServer = (await import("react-dom/server")).default;

        // Keep template selection behavior aligned with Puppeteer route
        let templateId = body.details?.pdfTemplate ?? 5;
        const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
        if (DEPRECATED_TEMPLATES.includes(templateId)) templateId = 5;
        const ProposalTemplate = await getProposalTemplate(templateId);
        if (!ProposalTemplate) {
            throw new Error("Failed to load ProposalTemplate for jsreport");
        }

        const sanitizedBody = sanitizeForClient<ProposalType>(body);
        const htmlTemplate = ReactDOMServer.renderToStaticMarkup(ProposalTemplate(sanitizedBody));

        const pageLayoutMap: Record<string, { width: string; height: string; landscape: boolean }> = {
            "portrait-letter": { width: "8.5in", height: "11in", landscape: false },
            "portrait-legal": { width: "8.5in", height: "14in", landscape: false },
            "portrait-a4": { width: "8.27in", height: "11.69in", landscape: false },
            "landscape-letter": { width: "11in", height: "8.5in", landscape: true },
            "landscape-legal": { width: "14in", height: "8.5in", landscape: true },
            "landscape-a4": { width: "11.69in", height: "8.27in", landscape: true },
        };
        const requestedLayout = (body.details as any)?.pageLayout;
        const pageLayout = pageLayoutMap[requestedLayout] ? requestedLayout : "portrait-letter";
        const layout = pageLayoutMap[pageLayout];

        const origin = getRequestOrigin(req).replace(/\/+$/, "");
        const baseHref = `${origin}/`;
        const fullHtml = `<!doctype html><html><head><meta charset="utf-8"/><base href="${baseHref}"/><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&family=Inter:wght@400;600;700&family=Montserrat:wght@400;600;700&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet"/><style>body,.font-sans{font-family:'Work Sans',system-ui,sans-serif!important;line-height:1.3!important;font-size:10px!important}h1,h2,h3,h4,h5,h6{font-family:'Work Sans',system-ui,sans-serif!important;line-height:1.3!important}p,div,span,td,th{line-height:1.3!important}.leading-relaxed{line-height:1.35!important}.leading-snug{line-height:1.25!important}@media print{@page{size:${layout.width} ${layout.height};margin:0}}</style></head><body>${htmlTemplate}</body></html>`;

        const jsreportPayload = {
            template: {
                engine: "none",
                recipe: "chrome-pdf",
                content: fullHtml,
                chrome: {
                    printBackground: true,
                    displayHeaderFooter: true,
                    headerTemplate: '<div style="font-size:1px;"></div>',
                    footerTemplate: `
                    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; width: 100%; padding: 0 40px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 4px; box-sizing: border-box;">
                        <div style="font-size: 7.5px; font-weight: 600; color: #0A52EF; letter-spacing: 0.3px;">www.anc.com</div>
                        <div style="font-size: 7px; color: #94a3b8;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
                    </div>
                    `,
                    marginTop: "20px",
                    marginBottom: "40px",
                    marginLeft: "20px",
                    marginRight: "20px",
                    width: layout.width,
                    height: layout.height,
                    landscape: layout.landscape,
                },
            },
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
