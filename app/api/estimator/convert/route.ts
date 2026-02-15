/**
 * POST /api/estimator/convert
 *
 * Converts an ESTIMATE project to INTELLIGENCE mode.
 * Creates ScreenConfig entries from estimator display answers.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { projectId } = body;

        if (!projectId) {
            return NextResponse.json({ error: "projectId is required" }, { status: 400 });
        }

        const project = await prisma.proposal.findUnique({
            where: { id: projectId },
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        if (project.calculationMode !== "ESTIMATE") {
            return NextResponse.json(
                { error: "Only ESTIMATE projects can be converted" },
                { status: 400 }
            );
        }

        // Extract estimator data
        const answers = (project.estimatorAnswers as any) || {};
        const displays = Array.isArray(answers.displays) ? answers.displays : [];

        // Build screen configs from estimator displays
        const screenData = displays.map((d: any, idx: number) => ({
            name: d.displayName || `Display ${idx + 1}`,
            width: d.widthFt || 0,
            height: d.heightFt || 0,
            pixelPitch: parseFloat(d.pixelPitch) || 4,
            serviceType: d.serviceType || "Front/Rear",
        }));

        // Convert to Intelligence mode
        const updated = await prisma.proposal.update({
            where: { id: projectId },
            data: {
                calculationMode: "INTELLIGENCE",
                estimatorDepth: answers.estimateDepth || "rom",
            },
        });

        // Create ScreenConfig entries from estimator displays
        for (const screen of screenData) {
            await prisma.screenConfig.create({
                data: {
                    proposalId: projectId,
                    name: screen.name,
                    width: screen.width,
                    height: screen.height,
                    pixelPitch: screen.pixelPitch,
                    serviceType: screen.serviceType,
                },
            });
        }

        return NextResponse.json({
            success: true,
            projectId: updated.id,
            screensCreated: screenData.length,
        });
    } catch (error) {
        console.error("POST /api/estimator/convert error:", error);
        return NextResponse.json({ error: "Conversion failed" }, { status: 500 });
    }
}
