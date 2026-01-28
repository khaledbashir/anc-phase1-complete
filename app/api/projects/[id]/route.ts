import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

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
        const body = await req.json();
        const { clientName, status, calculationMode, screens } = body;

        const updateData: any = {};

        if (clientName !== undefined) updateData.clientName = clientName;
        if (status !== undefined) updateData.status = status;
        if (calculationMode !== undefined) updateData.calculationMode = calculationMode;

        const project = await prisma.$transaction(async (tx) => {
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
                    await tx.screenConfig.create({
                        data: {
                            proposalId: id,
                            name: screen.name || "Unnamed Screen",
                            pixelPitch: Number(screen.pixelPitch || screen.pitchMm || 10),
                            width: Number(screen.width || screen.widthFt || 0),
                            height: Number(screen.height || screen.heightFt || 0),
                            lineItems: {
                                create: (screen.lineItems || []).map((li: any) => ({
                                    category: li.category || "Other",
                                    cost: Number(li.cost || 0),
                                    margin: Number(li.margin || 0),
                                    price: Number(li.price || 0),
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

    } catch (error) {
        console.error("PATCH /api/projects/[id] error:", error);
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
    } catch (error) {
        console.error("DELETE /api/projects/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        );
    }
}
