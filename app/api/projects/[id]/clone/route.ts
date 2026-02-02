/**
 * POST /api/projects/[id]/clone
 * REQ-114: Auto-clone signed proposal to new Draft version
 * 
 * Creates a new editable Draft from an immutable SIGNED/CLOSED proposal
 */

import { NextRequest, NextResponse } from "next/server";
import { prepareCloneData, isImmutable } from "@/lib/proposal-lifecycle";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Fetch original proposal
    const original = await prisma.proposal.findUnique({
      where: { id },
      include: { screens: { include: { lineItems: true } } }
    });

    if (!original) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // REQ-126: Validate that only APPROVED/SIGNED/CLOSED proposals can be cloned
    // DRAFT and PENDING_REVIEW should be edited directly, not cloned
    const cloneableStates = ["APPROVED", "SIGNED", "CLOSED"];
    if (!cloneableStates.includes(original.status as string)) {
      return NextResponse.json({ 
        error: `Cannot clone proposal in ${original.status} state. Only APPROVED, SIGNED, or CLOSED proposals can be cloned.`,
        currentStatus: original.status,
        allowedStates: cloneableStates,
        suggestion: "Edit the proposal directly instead of cloning."
      }, { status: 400 });
    }

    // 2. Prepare clone data
    const { cloneData, newVersion } = prepareCloneData(
      original,
      id,
      original.versionNumber || 1
    );

    // 3. Create new proposal (clone)
    const clonedProposal = await prisma.$transaction(async (tx) => {
      // Create the new proposal
      const newProposal = await tx.proposal.create({
        data: {
          workspaceId: original.workspaceId,
          clientName: cloneData.clientName,
          status: "DRAFT",
          calculationMode: original.calculationMode,
          internalAudit: original.internalAudit,
          clientSummary: original.clientSummary,
          taxRateOverride: original.taxRateOverride,
          bondRateOverride: original.bondRateOverride,
          structuralTonnage: original.structuralTonnage,
          reinforcingTonnage: original.reinforcingTonnage,
          isLocked: false,
          parentProposalId: id,
          versionNumber: newVersion,
        }
      });

      // Clone screens and line items
      for (const screen of original.screens) {
        const newScreen = await tx.screenConfig.create({
          data: {
            proposalId: newProposal.id,
            name: screen.name,
            pixelPitch: screen.pixelPitch,
            width: screen.width,
            height: screen.height,
          }
        });

        // Clone line items
        for (const item of screen.lineItems) {
          await tx.costLineItem.create({
            data: {
              screenConfigId: newScreen.id,
              category: item.category,
              cost: item.cost,
              margin: item.margin,
              price: item.price,
            }
          });
        }
      }

      return newProposal;
    });

    return NextResponse.json({
      success: true,
      message: `Created new Draft version (v${newVersion}) from signed proposal`,
      originalId: id,
      originalStatus: original.status,
      newProposalId: clonedProposal.id,
      newVersion: newVersion,
      status: "DRAFT",
      isLocked: false
    });

  } catch (error) {
    console.error("POST /api/projects/[id]/clone error:", error);
    return NextResponse.json({ error: "Failed to clone proposal" }, { status: 500 });
  }
}
