import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DELETE /api/venue-visualizer/photos/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.venuePhoto.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
