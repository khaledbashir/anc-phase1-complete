import { NextRequest, NextResponse } from "next/server";

// JSON2CSV
import { AsyncParser } from "@json2csv/node";

// XML2JS
import { Builder } from "xml2js";

// XLSX (legacy - kept for fallback)
import XLSX from "xlsx";

// ExcelJS Audit Export (Values Only)
import { generateAuditExcelBuffer, AuditExcelOptions } from "./exportFormulaicExcel";

// Helpers
import { flattenObject } from "@/lib/helpers";

// Types
import { ExportTypes } from "@/types";
import { ScreenInput } from "@/lib/estimator";

/**
 * Export an invoice in selected format.
 *
 * @param {NextRequest} req - The Next.js request object.
 * @returns {NextResponse} A response object containing the exported data in the requested format.
 */
export async function exportProposalService(req: NextRequest) {
    const body = await req.json();
    const format = req.nextUrl.searchParams.get("format");

    try {
        switch (format) {
            case ExportTypes.JSON:
                const jsonData = JSON.stringify(body);
                return new NextResponse(jsonData, {
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Disposition":
                            "attachment; filename=invoice.json",
                    },
                    status: 200,
                });
            case ExportTypes.CSV:
                //? Can pass specific fields to async parser. Empty = All
                const parser = new AsyncParser();
                const csv = await parser.parse(body).promise();
                return new NextResponse(csv, {
                    headers: {
                        "Content-Type": "text/csv",
                        "Content-Disposition":
                            "attachment; filename=invoice.csv",
                    },
                });
            case ExportTypes.XML:
                // Convert JSON to XML
                const builder = new Builder();
                const xml = builder.buildObject(body);
                return new NextResponse(xml, {
                    headers: {
                        "Content-Type": "application/xml",
                        "Content-Disposition":
                            "attachment; filename=invoice.xml",
                    },
                });
            case ExportTypes.XLSX:
                // Formulaic Excel Export - uses ExcelJS with live formulas
                // Senior estimators can modify inputs and see recalculations
                try {
                    // Extract screens from proposal body
                    const screens: ScreenInput[] = body.details?.screens || [];

                    // Build options from proposal data
                    const excelOptions: AuditExcelOptions = {
                        proposalName: body.details?.proposalId || body.details?.invoiceNumber || 'Proposal',
                        clientName: body.receiver?.name || 'Client',
                        proposalDate: body.details?.invoiceDate || new Date().toLocaleDateString(),
                        status: body.details?.status || 'DRAFT',
                    };

                    // Generate the audit Excel buffer
                    const xlsxBuffer = await generateAuditExcelBuffer(screens, excelOptions);

                    return new NextResponse(new Uint8Array(xlsxBuffer), {
                        headers: {
                            "Content-Type":
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                            "Content-Disposition":
                                `attachment; filename=ANC_Audit_${excelOptions.proposalName}.xlsx`,
                        },
                    });
                } catch (xlsxError) {
                    console.error("XLSX Export Error:", xlsxError);
                    return new Response(`Error generating XLSX: ${xlsxError}`, {
                        status: 500,
                    });
                }
        }
    } catch (error) {
        console.error(error);

        // Return an error response
        return new Response(`Error exporting: \n${error}`, {
            status: 500,
        });
    }
}
