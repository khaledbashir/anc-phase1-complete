import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProposalStatus } from "@prisma/client";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        const body = await req.json();
        const { fieldPath, userName, verified } = body;

        if (!fieldPath || !userName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Fetch current proposal to merge verification state
        const proposal = await prisma.proposal.findUnique({
            where: { id },
            select: { verifiedFields: true, aiFilledFields: true }
        });

        if (!proposal) {
            return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
        }

        let verifiedFields = (proposal.verifiedFields as any) || {};

        if (verified) {
            verifiedFields[fieldPath] = {
                verifiedBy: userName,
                verifiedAt: new Date().toISOString()
            };
        } else {
            delete verifiedFields[fieldPath];
        }

        const updatedProposal = await prisma.proposal.update({
            where: { id },
            data: {
                verifiedFields,
                lastVerifiedBy: userName,
                lastVerifiedAt: new Date(),
            }
        });

        return NextResponse.json({
            success: true,
            verifiedFields: updatedProposal.verifiedFields,
            lastVerifiedAt: updatedProposal.lastVerifiedAt
        });

    } catch (error) {
        console.error("[VERIFY_API_ERROR]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
