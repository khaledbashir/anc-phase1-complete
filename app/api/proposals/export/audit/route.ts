import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAuditExcelBuffer } from "@/services/proposal/server/exportFormulaicExcel";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const proposalId = body.proposalId;
    const projectAddress = typeof body.projectAddress === "string" ? body.projectAddress : "";
    const venue = typeof body.venue === "string" ? body.venue : "";

    if (!proposalId) {
      return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
    }

    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { screens: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Map internalAudit data to screens for the exporter
    let internalAudit: any = proposal.internalAudit;
    if (typeof internalAudit === "string" && internalAudit.trim() !== "") {
      try {
        internalAudit = JSON.parse(internalAudit);
      } catch {
        internalAudit = null;
      }
    }
    const screensWithAudit = (proposal.screens || []).map((screen, idx) => ({
      ...screen,
      internalAudit: internalAudit?.perScreen?.[idx] || null,
    }));

    const proposalName = proposal.clientName || "Proposal";
    const buffer = await generateAuditExcelBuffer(screensWithAudit, {
      proposalName,
      clientName: proposal.clientName,
      status: proposal.status as any,
      boTaxApplies: /morgantown|wvu|milan\s+puskar/i.test(`${projectAddress} ${venue}`),
    });

    return new Response(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=${proposalName.replace(/\s+/g, '_')}_Audit.xlsx`,
      },
    });
  } catch (err) {
    console.error("Audit export error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
