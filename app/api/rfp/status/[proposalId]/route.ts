import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/rfp/status/[proposalId]
 *
 * Polling endpoint for async RFP embedding/extraction pipeline.
 * Returns embeddingStatus + extractedData when complete.
 * Client polls every 4s, stops when status = "complete" | "failed".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> }
) {
  const { proposalId } = await params;

  if (!proposalId) {
    return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    select: {
      embeddingStatus: true,
      intelligenceBrief: true,
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  const brief = (proposal.intelligenceBrief as any) || {};

  return NextResponse.json({
    embeddingStatus: proposal.embeddingStatus || "pending",
    extractedData: brief.extractedData || null,
    extractionSummary: brief.extractedData?.extractionSummary || null,
    drawingManifest: brief.drawingManifest || null,
    filterStats: brief.filterStats || null,
  });
}
