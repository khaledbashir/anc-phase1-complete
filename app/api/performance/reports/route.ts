import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const reports = await prisma.performanceReport.findMany({
      orderBy: { generatedAt: "desc" },
      include: {
        venue: { select: { id: true, name: true, client: true, city: true, state: true } },
        sponsor: { select: { id: true, name: true, contact: true, email: true } },
      },
    });

    return NextResponse.json({ reports });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
