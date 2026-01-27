import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/projects/[id]/revisions
 * List all revisions for a project
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const revisions = await prisma.proposalRevision.findMany({
            where: { proposalId: id },
            orderBy: { version: "desc" },
            select: {
                id: true,
                version: true,
                createdAt: true,
                createdBy: true,
            },
        });

        return NextResponse.json({ revisions });
    } catch (error) {
        console.error("GET /api/projects/[id]/revisions error:", error);
        return NextResponse.json(
            { error: "Failed to fetch revisions" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects/[id]/revisions
 * Create a new revision (manual save with snapshot)
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const body = await req.json();
        const { userId } = body;

        // Get the current project state
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

        // Get the latest version number
        const latestRevision = await prisma.proposalRevision.findFirst({
            where: { proposalId: id },
            orderBy: { version: "desc" },
        });

        const nextVersion = (latestRevision?.version || 0) + 1;

        // Create a snapshot of the current state
        const snapshot = {
            senderData: project.senderData,
            receiverData: project.receiverData,
            // detailsData removed - ScreenConfig is source of truth
            internalAudit: project.internalAudit,
            clientSummary: project.clientSummary,
            screens: project.screens,
            marginFormula: project.marginFormula,
            bondFormula: project.bondFormula,
        };

        // Create the revision
        const revision = await prisma.proposalRevision.create({
            data: {
                proposalId: id,
                version: nextVersion,
                createdBy: userId,
                snapshot,
            },
        });

        // Create audit log
        await prisma.auditLog.create({
            data: {
                proposalId: id,
                action: "REVISION_CREATED",
                userId,
                metadata: { version: nextVersion },
            },
        });

        return NextResponse.json({
            revision: {
                id: revision.id,
                version: revision.version,
                createdAt: revision.createdAt,
            },
        }, { status: 201 });
    } catch (error) {
        console.error("POST /api/projects/[id]/revisions error:", error);
        return NextResponse.json(
            { error: "Failed to create revision" },
            { status: 500 }
        );
    }
}
