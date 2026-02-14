/**
 * /api/rate-card — Rate Card CRUD API
 *
 * GET:    List all rate card entries (optionally filter by category)
 * POST:   Create a new entry
 * PUT:    Update an existing entry (by id in body)
 * DELETE: Delete an entry (by id in query string)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const activeOnly = searchParams.get("active") !== "false";

        const where: any = {};
        if (activeOnly) where.isActive = true;
        if (category) where.category = category;

        const entries = await prisma.rateCardEntry.findMany({
            where,
            orderBy: [{ category: "asc" }, { key: "asc" }],
        });

        const categories = await prisma.rateCardEntry.groupBy({
            by: ["category"],
            _count: true,
            where: activeOnly ? { isActive: true } : undefined,
        });

        return NextResponse.json({
            entries,
            categories: categories.map((c) => ({ name: c.category, count: c._count })),
            total: entries.length,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { category, key, label, value, unit, provenance, confidence } = body;

        if (!category || !key || !label || value == null || !unit) {
            return NextResponse.json(
                { error: "Missing required fields: category, key, label, value, unit" },
                { status: 400 }
            );
        }

        const entry = await prisma.rateCardEntry.create({
            data: {
                category,
                key,
                label,
                value,
                unit,
                provenance: provenance || null,
                confidence: confidence || "estimated",
            },
        });

        return NextResponse.json({ entry }, { status: 201 });
    } catch (err: any) {
        if (err.code === "P2002") {
            return NextResponse.json({ error: `Duplicate key: "${(await request.clone().json()).key}" already exists` }, { status: 409 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        const entry = await prisma.rateCardEntry.update({
            where: { id },
            data,
        });

        return NextResponse.json({ entry });
    } catch (err: any) {
        if (err.code === "P2025") {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing id" }, { status: 400 });
        }

        await prisma.rateCardEntry.delete({ where: { id } });
        return NextResponse.json({ deleted: true });
    } catch (err: any) {
        if (err.code === "P2025") {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
