/**
 * GET /api/rfp/analyses/:id — Get full analysis detail
 *
 * Returns complete analysis with screens, requirements, project info, triage.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const analysis = await prisma.rfpAnalysis.findUnique({
    where: { id },
  });

  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  return NextResponse.json(analysis);
}

/**
 * PATCH /api/rfp/analyses/:id — Update analysis (e.g., set project name)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  // Only allow updating safe fields
  const allowed = ["projectName", "clientName", "venue", "location"];
  const data: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body && typeof body[key] === "string") {
      data[key] = body[key];
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const updated = await prisma.rfpAnalysis.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}
