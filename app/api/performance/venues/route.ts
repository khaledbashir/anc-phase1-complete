import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      orderBy: { name: "asc" },
      include: {
        screens: {
          where: { isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, location: true, manufacturer: true, pixelPitch: true, widthFt: true, heightFt: true },
        },
        _count: { select: { reports: true } },
      },
    });

    return NextResponse.json({ venues });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
