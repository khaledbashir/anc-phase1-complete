import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const proposalId = body.proposalId;

    if (!proposalId) {
      return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const internalAudit = (proposal as any).internalAudit;
    const clientSummary = (proposal as any).clientSummary;

    if (!internalAudit) {
      return NextResponse.json({ error: "No internal audit available for this proposal" }, { status: 404 });
    }

    // Build workbook
    const wb = XLSX.utils.book_new();

    // Tab 1: Summary
    const summaryRows = [
      ["Subtotal", clientSummary?.subtotal ?? ""],
      ["Total", clientSummary?.total ?? ""],
      [],
      ["Hardware", clientSummary?.breakdown?.hardware ?? ""],
      ["Structure", clientSummary?.breakdown?.structure ?? ""],
      ["Install", clientSummary?.breakdown?.install ?? ""],
      ["Others", clientSummary?.breakdown?.others ?? ""],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Tab 2: Detailed Calculation
    const detailHeader = [
      "Screen Name",
      "Product Type",
      "Quantity",
      "Area (sqft)",
      "Pixels",
      "Hardware",
      "Structure",
      "Install",
      "Labor",
      "Power",
      "Shipping",
      "PM",
      "General Conditions",
      "Travel",
      "Submittals",
      "Engineering",
      "Permits",
      "CMS",
      "Bond",
      "Margin Amount",
      "Total Cost",
      "Total Price",
    ];

    const detailRows = [detailHeader];

    for (const s of internalAudit.perScreen) {
      const b = s.breakdown;
      detailRows.push([
        s.name,
        s.productType ?? "",
        s.quantity ?? 1,
        s.areaSqFt,
        s.pixelResolution,
        b.hardware,
        b.structure,
        b.install,
        b.labor,
        b.power,
        b.shipping,
        b.pm,
        b.generalConditions,
        b.travel,
        b.submittals,
        b.engineering,
        b.permits,
        b.cms,
        b.bondCost,
        b.ancMargin,
        b.totalCost,
        b.finalClientTotal,
      ]);
    }

    const wsDetails = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetails, "Detailed Calculation");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=proposal-${proposalId}-audit.xlsx`,
      },
    });
  } catch (err) {
    console.error("Audit export error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}