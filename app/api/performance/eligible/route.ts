import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/performance/eligible
 *
 * Returns proposals that are SIGNED, APPROVED, or CLOSED — 
 * i.e., real deals that have been won, where screens are (or will be) installed.
 * Excludes proposals that have already been activated as venues.
 */
export async function GET() {
  try {
    // Get all proposal IDs that already have venues
    const activatedVenues = await prisma.venue.findMany({
      where: { sourceProposalId: { not: null } },
      select: { sourceProposalId: true },
    });
    const activatedIds = new Set(activatedVenues.map(v => v.sourceProposalId));

    // Get signed/approved/closed proposals
    const proposals = await prisma.proposal.findMany({
      where: {
        status: { in: ["SIGNED", "APPROVED", "CLOSED"] },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        screens: {
          select: {
            id: true,
            name: true,
            customDisplayName: true,
            externalName: true,
            pixelPitch: true,
            width: true,
            height: true,
            quantity: true,
          },
        },
      },
    });

    const eligible = proposals.map(p => ({
      id: p.id,
      clientName: p.clientName,
      venue: p.venue,
      city: p.clientCity,
      status: p.status,
      documentMode: p.documentMode,
      screenCount: p.screens.length,
      screens: p.screens.map(s => ({
        name: s.customDisplayName || s.externalName || s.name,
        pixelPitch: s.pixelPitch,
        widthFt: s.width,
        heightFt: s.height,
      })),
      alreadyActivated: activatedIds.has(p.id),
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ eligible });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
