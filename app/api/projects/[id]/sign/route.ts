/**
 * POST /api/projects/[id]/sign
 * REQ-114: E-Signature endpoint with full audit trail
 * 
 * Transitions proposal to SIGNED state and creates immutable record
 */

import { NextRequest, NextResponse } from "next/server";
import { 
  prepareSignatureTransition, 
  isImmutable,
} from "@/lib/proposal-lifecycle";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch proposal
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      include: { screens: { include: { lineItems: true } } }
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // 2. Check if already immutable
    if (isImmutable(proposal.status)) {
      return NextResponse.json({ 
        error: `Proposal is already ${proposal.status} and cannot be signed again.`,
        isLocked: true
      }, { status: 400 });
    }

    // 3. Parse signature payload
    const body = await req.json();
    const signaturePayload = {
      signerEmail: body.signerEmail,
      signerName: body.signerName,
      signerTitle: body.signerTitle,
      signerRole: body.signerRole as "ANC_REPRESENTATIVE" | "PURCHASER",
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown",
      userAgent: req.headers.get("user-agent") || undefined,
      authMethod: body.authMethod || "MANUAL" as const,
    };

    // 4. Prepare transition
    const transition = prepareSignatureTransition(
      proposal.status,
      proposal,
      signaturePayload
    );

    if (!transition.valid) {
      return NextResponse.json({ error: transition.error }, { status: 400 });
    }

    // 5. Execute atomic transaction - lock proposal and create audit trail
    const result = await prisma.$transaction(async (tx) => {
      // Lock the proposal
      const updatedProposal = await tx.proposal.update({
        where: { id },
        data: {
          status: transition.lockData!.status,
          isLocked: transition.lockData!.isLocked,
          lockedAt: transition.lockData!.lockedAt,
          documentHash: transition.lockData!.documentHash,
        }
      });

      // Create audit trail record
      const auditTrail = await tx.signatureAuditTrail.create({
        data: {
          proposalId: id,
          ...transition.auditTrailData!
        }
      });

      return { proposal: updatedProposal, auditTrail };
    });

    return NextResponse.json({
      success: true,
      message: "Proposal signed and locked successfully",
      proposalId: id,
      status: result.proposal.status,
      isLocked: result.proposal.isLocked,
      documentHash: result.proposal.documentHash,
      signedAt: result.auditTrail.signedAt,
      auditTrailId: result.auditTrail.id
    });

  } catch (error) {
    console.error("POST /api/projects/[id]/sign error:", error);
    return NextResponse.json({ error: "Failed to sign proposal" }, { status: 500 });
  }
}
