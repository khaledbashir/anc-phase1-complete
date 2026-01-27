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
                rfpQuestions: {
                    orderBy: { order: "asc" },
                },
                revisions: {
                    orderBy: { version: "desc" },
                    take: 10,
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
 * Auto-save (heartbeat) endpoint
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await req.json();
        const { senderData, receiverData, status, proposalName, changeSource } = body;

        const updateData: any = {
            lastSavedAt: new Date(),
        };

        if (senderData !== undefined) updateData.senderData = senderData;
        if (receiverData !== undefined) updateData.receiverData = receiverData;
        if (status !== undefined) updateData.status = status;
        if (proposalName !== undefined) updateData.proposalName = proposalName;

        // Extract clientName from receiverData if present
        if (receiverData?.name) {
            updateData.clientName = receiverData.name;
        }

        const project = await prisma.proposal.update({
            where: { id },
            data: updateData,
            select: { lastSavedAt: true, id: true },
        });

        // Create audit log for save with change source
        await prisma.auditLog.create({
            data: {
                proposalId: id,
                action: "SAVED",
                changeSource: changeSource || "SYSTEM",
                metadata: { fieldsUpdated: Object.keys(body) },
            },
        });

        return NextResponse.json({
            success: true,
            lastSavedAt: project.lastSavedAt,
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
