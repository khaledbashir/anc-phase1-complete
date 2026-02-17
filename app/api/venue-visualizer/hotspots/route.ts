import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/venue-visualizer/hotspots — create a hotspot on a photo
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { photoId, zoneType, label, leftPct, topPct, widthPct, heightPct, cssTransform, sortOrder } = body;
    if (!photoId || !zoneType || !label || leftPct == null || topPct == null || widthPct == null || heightPct == null) {
      return NextResponse.json({ error: "photoId, zoneType, label, leftPct, topPct, widthPct, heightPct required" }, { status: 400 });
    }
    const hotspot = await prisma.screenHotspot.create({
      data: { photoId, zoneType, label, leftPct, topPct, widthPct, heightPct, cssTransform: cssTransform || null, sortOrder: sortOrder || 0 },
    });
    return NextResponse.json({ hotspot });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
