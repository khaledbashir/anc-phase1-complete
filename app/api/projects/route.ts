import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * GET /api/projects
 * List all projects (paginated, filterable)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const search = searchParams.get("search") || "";
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "20");
        const offset = parseInt(searchParams.get("offset") || "0");

        const where: any = {};

        if (workspaceId) {
            where.workspaceId = workspaceId;
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { clientName: { contains: search, mode: "insensitive" } },
                { proposalName: { contains: search, mode: "insensitive" } },
            ];
        }

        const [projects, total] = await Promise.all([
            prisma.proposal.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    clientName: true,
                    proposalName: true,
                    status: true,
                    documentType: true,
                    pricingType: true,
                    createdAt: true,
                    updatedAt: true,
                    lastSavedAt: true,
                    aiWorkspaceSlug: true,
                },
            }),
            prisma.proposal.count({ where }),
        ]);

        return NextResponse.json({
            projects,
            total,
            limit,
            offset,
        });
    } catch (error) {
        console.error("GET /api/projects error:", error);
        return NextResponse.json(
            { error: "Failed to fetch projects" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/projects
 * Create a new project (auto-creates AnythingLLM workspace)
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { workspaceId, clientName, proposalName, documentType, pricingType } = body;

        if (!workspaceId || !clientName) {
            return NextResponse.json(
                { error: "workspaceId and clientName are required" },
                { status: 400 }
            );
        }

        // Create a dedicated AnythingLLM workspace for this project
        let aiWorkspaceSlug: string | null = null;
        const anythingLlmUrl = process.env.ANYTHING_LLM_BASE_URL;
        const anythingLlmKey = process.env.ANYTHING_LLM_KEY;

        if (anythingLlmUrl && anythingLlmKey) {
            try {
                const slugName = `project-${clientName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
                const workspaceRes = await fetch(`${anythingLlmUrl}/v1/admin/workspaces/new`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${anythingLlmKey}`,
                    },
                    body: JSON.stringify({ name: slugName }),
                });

                if (workspaceRes.ok) {
                    const workspaceData = await workspaceRes.json();
                    aiWorkspaceSlug = workspaceData.workspace?.slug || slugName;
                }
            } catch (aiError) {
                console.error("Failed to create AnythingLLM workspace:", aiError);
                // Continue without AI workspace
            }
        }

        // Create the project in the database
        const project = await prisma.proposal.create({
            data: {
                workspaceId,
                clientName,
                proposalName: proposalName || clientName,
                documentType: documentType || "First Round",
                pricingType: pricingType || "Budget",
                status: "DRAFT",
                aiWorkspaceSlug,
                marginFormula: "P = C / (1 - M)",
                bondFormula: "B = P * 0.015",
            },
        });

        // Create initial audit log
        await prisma.auditLog.create({
            data: {
                proposalId: project.id,
                action: "CREATED",
                metadata: { clientName, proposalName },
            },
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error("POST /api/projects error:", error);
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        );
    }
}
