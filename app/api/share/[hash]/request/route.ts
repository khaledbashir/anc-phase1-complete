export const runtime = "nodejs";
export const maxDuration = 10;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ hash: string }> }
) {
	const { hash } = await params;
	try {
		const body = await req.json().catch(() => null);
		const requesterName = (body?.name || "").toString().trim();
		const requesterEmail = (body?.email || "").toString().trim();
		const message = (body?.message || "").toString().trim();

		if (!requesterName || !message) {
			return NextResponse.json(
				{ error: "Missing required fields: name and message" },
				{ status: 400 }
			);
		}

		const snapshot = await prisma.proposalSnapshot.findUnique({
			where: { shareHash: hash },
			select: { proposalId: true, expiresAt: true },
		});

		if (!snapshot) {
			return NextResponse.json({ error: "Share link not found" }, { status: 404 });
		}

		if (snapshot.expiresAt && snapshot.expiresAt.getTime() < Date.now()) {
			return NextResponse.json({ error: "Share link expired" }, { status: 410 });
		}

		const created = await prisma.changeRequest.create({
			data: {
				proposalId: snapshot.proposalId,
				shareHash: hash,
				requesterName,
				requesterEmail: requesterEmail || null,
				message,
			},
		});

		await prisma.activityLog.create({
			data: {
				proposalId: snapshot.proposalId,
				action: "CLIENT_CHANGE_REQUEST",
				description: `Client requested changes via share link`,
				metadata: {
					shareHash: hash,
					requesterName,
					requesterEmail: requesterEmail || undefined,
					changeRequestId: created.id,
				},
			},
		});

		return NextResponse.json({ ok: true, id: created.id });
	} catch (error: any) {
		return NextResponse.json(
			{ error: "Failed to submit request", details: error?.message || String(error) },
			{ status: 500 }
		);
	}
}
