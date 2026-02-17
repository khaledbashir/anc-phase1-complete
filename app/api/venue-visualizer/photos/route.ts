import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/venue-visualizer/photos — create a photo record for a venue
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { venueId, label, imageUrl, sortOrder } = body;
    if (!venueId || !label || !imageUrl) {
      return NextResponse.json({ error: "venueId, label, imageUrl required" }, { status: 400 });
    }
    const photo = await prisma.venuePhoto.create({
      data: { venueId, label, imageUrl, sortOrder: sortOrder || 0 },
    });
    return NextResponse.json({ photo });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
