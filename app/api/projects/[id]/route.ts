import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { isImmutable, isFinancialLocked, LOCKED_FINANCIAL_FIELDS } from "@/lib/proposal-lifecycle";

const prisma = new PrismaClient();

/**
 * GET /api/projects/[id]
 * Fetch full project with latest data
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const project = await prisma.proposal.findUnique({
            where: { id },
            include: {
                screens: {
                    include: { lineItems: true },
                },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({ project });
    } catch (error) {
        console.error("GET /api/projects/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/projects/[id]
 * Update proposal data
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        // REQ-125: Immutability enforcement - check status before allowing edits
        const existingProject = await prisma.proposal.findUnique({
            where: { id },
            select: { status: true, isLocked: true }
        });

        if (!existingProject) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        // Block edits on SIGNED/CLOSED proposals (fully immutable)
        if (isImmutable(existingProject.status as any) || existingProject.isLocked) {
            return NextResponse.json(
                { 
                    error: `Proposal is ${existingProject.status} and cannot be edited. This version is a permanent contractual record.`,
                    action: "clone",
                    message: "To make changes, create a new version (clone) of this proposal."
                },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { 
            clientName, 
            proposalName, 
            status, 
            calculationMode, 
            internalAudit,
            clientSummary,
            screens,
            taxRateOverride,
            bondRateOverride,
            createSnapshot, // NEW: Flag to create a version snapshot
            totalSellingPrice, // NEW: For version history
            averageMargin // NEW: For version history
        } = body;

        // REQ-125: Block financial field edits on APPROVED proposals
        if (isFinancialLocked(existingProject.status as any)) {
            const financialFieldsInRequest = Object.keys(body).filter(key => 
                LOCKED_FINANCIAL_FIELDS.includes(key as any)
            );
            if (financialFieldsInRequest.length > 0) {
                return NextResponse.json(
                    { 
                        error: `Proposal is APPROVED. Financial fields are locked: ${financialFieldsInRequest.join(', ')}`,
                        lockedFields: financialFieldsInRequest,
                        message: "Only cosmetic/branding changes are allowed on APPROVED proposals."
                    },
                    { status: 403 }
                );
            }
        }

        const updateData: any = {};

        // Map proposalName to clientName if clientName is missing
        const effectiveClientName = clientName || proposalName;
        if (effectiveClientName !== undefined) updateData.clientName = effectiveClientName;
        
        if (status !== undefined) updateData.status = status;
        if (calculationMode !== undefined) updateData.calculationMode = calculationMode;
        if (taxRateOverride !== undefined) updateData.taxRateOverride = taxRateOverride;
        if (bondRateOverride !== undefined) updateData.bondRateOverride = bondRateOverride;
        if (internalAudit !== undefined) updateData.internalAudit = typeof internalAudit === "string" ? internalAudit : JSON.stringify(internalAudit);
        if (clientSummary !== undefined) updateData.clientSummary = typeof clientSummary === "string" ? clientSummary : JSON.stringify(clientSummary);

        const project = await prisma.$transaction(async (tx) => {
            // Handle snapshot creation if requested
            if (createSnapshot) {
                const latestVersion = await tx.bidVersion.findFirst({
                    where: { proposalId: id },
                    orderBy: { versionNumber: 'desc' }
                });

                const nextVersion = (latestVersion?.versionNumber || 0) + 1;

                await tx.bidVersion.create({
                    data: {
                        proposalId: id,
                        versionNumber: nextVersion,
                        taxRate: taxRateOverride ?? undefined,
                        bondRate: bondRateOverride ?? undefined,
                        margin: averageMargin ?? undefined,
                        totalSellingPrice: totalSellingPrice ?? undefined,
                    }
                });
            }

            // Update the main proposal record
            const updated = await tx.proposal.update({
                where: { id },
                data: updateData,
                select: { id: true },
            });

            // If screens are provided, sync them (destructive sync for screens)
            if (screens && Array.isArray(screens)) {
                // Delete existing screens and line items
                await tx.screenConfig.deleteMany({
                    where: { proposalId: id }
                });

                // Create new screens with correct schema
                for (const screen of screens) {
                    // Defensive number conversion helper
                    const toNum = (val: any, fallback: number = 0) => {
                        const n = Number(val);
                        return isNaN(n) ? fallback : n;
                    };

                    await tx.screenConfig.create({
                        data: {
                            proposalId: id,
                            name: screen.name || "Unnamed Screen",
                            pixelPitch: toNum(screen.pixelPitch || screen.pitchMm, 10),
                            width: toNum(screen.width || screen.widthFt, 0),
                            height: toNum(screen.height || screen.heightFt, 0),
                            lineItems: {
                                create: (screen.lineItems || []).map((li: any) => ({
                                    category: li.category || "Other",
                                    cost: toNum(li.cost, 0),
                                    margin: toNum(li.margin, 0),
                                    price: toNum(li.price, 0),
                                }))
                            }
                        }
                    });
                }
            }

            return updated;
        });

        return NextResponse.json({
            success: true,
            id: project.id,
        });

    } catch (error: any) {
        console.error("PATCH /api/projects/[id] error:", error);

        // Handle "Record not found" error codes
        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: "Project not found (it may have been deleted or you are using a stale link)" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: "Failed to save project" },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/projects/[id]
 * Delete a project (soft delete recommended, but hard delete for now)
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        await prisma.proposal.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/projects/[id] error:", error);

        if (error.code === 'P2025') {
            return NextResponse.json({ success: true, message: "Project already deleted or not found" });
        }

        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        );
    }
}
