import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapDbProposalToFormSchema } from "@/lib/proposals/mapDbProposalToForm";

function getRequestOrigin(req: NextRequest): string {
    const xfProto = req.headers.get("x-forwarded-proto");
    const xfHost = req.headers.get("x-forwarded-host");
    const host = xfHost || req.headers.get("host");
    const proto = (xfProto || req.nextUrl.protocol.replace(":", "") || "http").split(",")[0].trim() || "http";
    if (host) return `${proto}://${host.split(",")[0].trim()}`;
    return req.nextUrl.origin;
}

function safeFilenamePart(value: string): string {
    return value
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_")
        .slice(0, 80);
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        const project = await prisma.proposal.findUnique({
            where: { id },
            include: {
                screens: {
                    include: { lineItems: true },
                },
            },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        const formPayload = mapDbProposalToFormSchema(project);
        const origin = getRequestOrigin(req).replace(/\/+$/, "");
        const exportRes = await fetch(`${origin}/api/proposal/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formPayload),
            cache: "no-store",
        });

        if (!exportRes.ok) {
            const errorText = await exportRes.text();
            return NextResponse.json(
                { error: "Failed to generate PDF", details: errorText },
                { status: exportRes.status }
            );
        }

        const bytes = await exportRes.arrayBuffer();
        const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const clientPart = safeFilenamePart(project.clientName || "Project");
        const filename = `ANC_${clientPart}_${project.documentMode}_${datePart}.pdf`;

        return new NextResponse(bytes, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Cache-Control": "no-cache",
            },
        });
    } catch (error: any) {
        console.error("POST /api/projects/[id]/pdf error:", error);
        return NextResponse.json(
            { error: "Failed to export PDF", details: error?.message || String(error) },
            { status: 500 }
        );
    }
}

