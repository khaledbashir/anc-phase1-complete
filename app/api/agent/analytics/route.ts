import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action;

    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

    switch (action) {
      case "avgMargin": {
        // Optionally filter by workspace
        const workspaceId = body.workspaceId;
        const proposals = await prisma.proposal.findMany({ where: { workspaceId: workspaceId ?? undefined }, take: 500 });
        const margins: number[] = [];
        for (const p of proposals) {
          const ia = (p as any).internalAudit as any;
          if (ia && ia.totals && typeof ia.totals.margin === "number" && ia.totals.finalClientTotal) {
            margins.push(ia.totals.margin / (ia.totals.finalClientTotal || 1));
          }
        }
        const avg = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : null;
        return NextResponse.json({ ok: true, avgMargin: avg }, { status: 200 });
      }

      case "medianCostPerSqFt": {
        const productId = body.productId;
        // Search CostLineItems for category 'LED Hardware' and compute median
        const items = await prisma.costLineItem.findMany({ where: { category: "Hardware" }, take: 1000 });
        const costs = items.map((i) => Number(i.cost));
        if (costs.length === 0) return NextResponse.json({ ok: true, median: null }, { status: 200 });
        costs.sort((a, b) => a - b);
        const mid = Math.floor(costs.length / 2);
        const median = costs.length % 2 === 0 ? (costs[mid - 1] + costs[mid]) / 2 : costs[mid];
        return NextResponse.json({ ok: true, median }, { status: 200 });
      }

      case "recentProposalsWithProduct": {
        const productId = body.productId;
        const limit = Number(body.limit || 10);
        if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });
        // naive search: find proposals where any screen name or productType matches productId
        const proposals = await prisma.proposal.findMany({ where: { OR: [{ clientName: { contains: productId } }, { screens: { some: { name: { contains: productId } } } }] }, orderBy: { id: 'desc' }, take: limit });
        return NextResponse.json({ ok: true, proposals }, { status: 200 });
      }

      default:
        return NextResponse.json({ error: "unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("/api/agent/analytics error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}