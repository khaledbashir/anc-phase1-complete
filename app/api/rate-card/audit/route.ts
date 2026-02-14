/**
 * /api/rate-card/audit — Audit trail for rate card changes
 *
 * GET: List audit entries, optionally filtered by entryId
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const entryId = searchParams.get("entryId");
        const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

        const where: any = {};
        if (entryId) where.entryId = entryId;

        const audits = await prisma.rateCardAudit.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit,
            include: {
                entry: { select: { key: true, label: true } },
            },
        });

        return NextResponse.json({ audits, total: audits.length });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
