import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

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
            ];
        }

        const [projects, total] = await Promise.all([
            prisma.proposal.findMany({
                where,
                orderBy: { id: "desc" },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    clientName: true,
                    clientLogo: true,
                    status: true,
                    calculationMode: true,
                    aiWorkspaceSlug: true,
                    createdAt: true,
                    updatedAt: true,
                } as any,
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
        const { workspaceId, clientName } = body;

        if (!workspaceId || !clientName) {
            return NextResponse.json(
                { error: "workspaceId and clientName are required" },
                { status: 400 }
            );
        }

        // Create a dedicated AnythingLLM workspace for this project
        let aiWorkspaceSlug: string | null = null;

        if (ANYTHING_LLM_BASE_URL && ANYTHING_LLM_KEY) {
            try {
                const slugName = `project-${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

                // Endpoint: /api/v1/workspace/new
                const workspaceRes = await fetch(`${ANYTHING_LLM_BASE_URL}/v1/workspace/new`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
                    },
                    body: JSON.stringify({ name: slugName, chatMode: "chat" }),
                });

                if (workspaceRes.ok) {
                    const workspaceData = await workspaceRes.json();
                    aiWorkspaceSlug = workspaceData.workspace?.slug || slugName;
                    console.log(`Created isolated AnythingLLM workspace: ${aiWorkspaceSlug}`);
                } else {
                    const errText = await workspaceRes.text();
                    console.warn(`AnythingLLM workspace creation returned ${workspaceRes.status}: ${errText}`);
                }
            } catch (aiError) {
                console.error("Failed to create AnythingLLM workspace:", aiError);
                // Continue without AI workspace
            }
        } else {
            console.warn("AnythingLLM config missing, skipping isolated workspace creation.");
        }


        // Create the project in the database
        const project = await prisma.proposal.create({
            data: {
                workspaceId,
                clientName,
                status: "DRAFT",
                aiWorkspaceSlug,
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
