import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sponsors = await prisma.sponsor.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: { select: { playLogs: true, reports: true } },
      },
    });

    return NextResponse.json({ sponsors });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
