export const runtime = "nodejs";
export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const items = await prisma.changeRequest.findMany({
			where: { proposalId: id },
			orderBy: { createdAt: "desc" },
		});
		return NextResponse.json({ ok: true, items });
	} catch (error: any) {
		return NextResponse.json(
			{ error: "Failed to load change requests", details: error?.message || String(error) },
			{ status: 500 }
		);
	}
}

export async function PATCH(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	try {
		const body = await req.json().catch(() => null);
		const requestId = (body?.requestId || "").toString();
		const status = (body?.status || "").toString();
		const resolvedBy = (body?.resolvedBy || "").toString() || "system";

		if (!requestId || (status !== "OPEN" && status !== "RESOLVED")) {
			return NextResponse.json(
				{ error: "requestId and valid status required" },
				{ status: 400 }
			);
		}

		const updated = await prisma.changeRequest.update({
			where: { id: requestId },
			data: {
				status: status as any,
				resolvedAt: status === "RESOLVED" ? new Date() : null,
				resolvedBy: status === "RESOLVED" ? resolvedBy : null,
			},
		});

		await prisma.activityLog.create({
			data: {
				proposalId: id,
				action: "CHANGE_REQUEST_STATUS",
				description: `Change request ${status.toLowerCase()}`,
				metadata: { requestId, status, resolvedBy },
			},
		});

		return NextResponse.json({ ok: true, item: updated });
	} catch (error: any) {
		return NextResponse.json(
			{ error: "Failed to update change request", details: error?.message || String(error) },
			{ status: 500 }
		);
	}
}
