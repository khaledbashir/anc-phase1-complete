import { NextRequest, NextResponse } from "next/server";
import { provisionProjectWorkspace } from "@/lib/anything-llm";

import { prisma } from "@/lib/prisma";

type PricingDocumentLike = {
    documentTotal?: number | string | null;
    currency?: string | null;
    tables?: unknown[];
};

const toFiniteNumber = (value: unknown): number | null => {
    if (typeof value === "number") return Number.isFinite(value) ? value : null;
    if (typeof value === "string") {
        const parsed = Number(value.replace(/,/g, ""));
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (typeof value === "bigint") return Number(value);
    if (value && typeof value === "object" && "toNumber" in value && typeof (value as any).toNumber === "function") {
        const parsed = (value as any).toNumber();
        return Number.isFinite(parsed) ? parsed : null;
    }
    if (value && typeof value === "object" && "toString" in value && typeof (value as any).toString === "function") {
        const parsed = Number((value as any).toString());
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
};

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
        const minAmount = searchParams.get("minAmount");
        const maxAmount = searchParams.get("maxAmount");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const minScreens = parseInt(searchParams.get("minScreens") || "0");
        const limit = parseInt(searchParams.get("limit") || "50");
        const offset = parseInt(searchParams.get("offset") || "0");

        const where: any = {};

        if (workspaceId) where.workspaceId = workspaceId;
        if (status && status !== "all") where.status = status;

        if (search) {
            where.OR = [
                { clientName: { contains: search, mode: "insensitive" } },
                { venue: { contains: search, mode: "insensitive" } },
                { clientCity: { contains: search, mode: "insensitive" } },
            ];
        }

        // Date Range Filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        // Fetch projects with essential fields to derive dashboard card data.
        const [projectsRaw, total] = await Promise.all([
            prisma.proposal.findMany({
                where,
                orderBy: { updatedAt: "desc" },
                take: limit,
                skip: offset,
                select: {
                    id: true,
                    createdAt: true,
                    updatedAt: true,
                    status: true,
                    clientName: true,
                    clientAddress: true,
                    clientCity: true,
                    clientZip: true,
                    venue: true,
                    documentMode: true,
                    mirrorMode: true,
                    pricingDocument: true,
                    clientLogo: true,
                    versions: {
                        orderBy: { createdAt: "desc" },
                        take: 1,
                        select: { totalSellingPrice: true }
                    },
                    screens: {
                        select: { id: true },
                    },
                }
            }),
            prisma.proposal.count({ where }),
        ]);

        let projects = projectsRaw.map((project) => {
            const pricingDocument = (project.pricingDocument as PricingDocumentLike | null) ?? null;
            const pricingDocumentTotal = toFiniteNumber(pricingDocument?.documentTotal);
            const latestBidTotal = toFiniteNumber(project.versions?.[0]?.totalSellingPrice);
            const tables = pricingDocument?.tables;
            const pricingTables = Array.isArray(tables) ? tables : [];

            let totalAmount = 0;
            if (pricingDocumentTotal !== null) {
                totalAmount = pricingDocumentTotal;
            } else if (latestBidTotal !== null) {
                totalAmount = latestBidTotal;
            }

            const sectionCount = pricingTables.length;

            return {
                id: project.id,
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
                status: project.status,
                clientName: project.clientName || "Untitled Project",
                clientCity: project.clientCity || null,
                clientAddress: project.clientAddress || null,
                clientZip: project.clientZip || null,
                clientLogo: project.clientLogo || null,
                venue: project.venue || null,
                documentMode: project.documentMode || "BUDGET",
                mirrorMode: project.mirrorMode ?? true,
                totalAmount,
                currency: pricingDocument?.currency || "USD",
                sectionCount,
                hasExcel: sectionCount > 0,
                screenCount: project.screens?.length || 0,
            };
        });

        const minAmountNumber = minAmount ? Number(minAmount) : null;
        const maxAmountNumber = maxAmount ? Number(maxAmount) : null;
        if (Number.isFinite(minAmountNumber) || Number.isFinite(maxAmountNumber)) {
            projects = projects.filter((project) => {
                const amount = project.totalAmount || 0;
                if (Number.isFinite(minAmountNumber) && amount < (minAmountNumber as number)) return false;
                if (Number.isFinite(maxAmountNumber) && amount > (maxAmountNumber as number)) return false;
                return true;
            });
        }

        if (minScreens > 0) {
            projects = projects.filter(p => p.screenCount >= minScreens);
        }

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

        // Create the project in the database first (so we have an ID for the slug)
        const project = await prisma.proposal.create({
            data: {
                workspaceId,
                clientName,
                status: "DRAFT",
            },
        });

        // Provision a dedicated AnythingLLM workspace (non-blocking for fast UI)
        const warnings: string[] = [];
        const aiWorkspaceSlug = await provisionProjectWorkspace(clientName, project.id);

        if (aiWorkspaceSlug) {
            await prisma.proposal.update({
                where: { id: project.id },
                data: { aiWorkspaceSlug },
            });
            project.aiWorkspaceSlug = aiWorkspaceSlug;
        } else {
            warnings.push("AI workspace creation failed — project created without AI features");
        }

        return NextResponse.json({ project, warnings }, { status: 201 });
    } catch (error) {
        console.error("POST /api/projects error:", error);
        return NextResponse.json(
            { error: "Failed to create project" },
            { status: 500 }
        );
    }
}
