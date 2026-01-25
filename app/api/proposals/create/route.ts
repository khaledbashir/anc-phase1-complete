import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateScreenPrice } from "@/lib/estimator";

export interface CreateProposalRequest {
  workspaceId: string;
  clientName: string;
  screens: Array<{
    name: string;
    pixelPitch: number;
    width: number;
    height: number;
    isOutdoor?: boolean;
  }>;
}

/**
 * POST /api/proposals/create
 * Creates a new proposal with screen configurations and cost line items
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateProposalRequest = await request.json();

    // Validate required fields
    if (!body.workspaceId || !body.clientName || !body.screens) {
      return NextResponse.json(
        { error: "Missing required fields: workspaceId, clientName, or screens" },
        { status: 400 }
      );
    }

    // Verify workspace exists
    const workspace = await prisma.workspace.findUnique({
      where: { id: body.workspaceId },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Create the proposal with all related data
    const proposal = await prisma.proposal.create({
      data: {
        workspaceId: body.workspaceId,
        clientName: body.clientName,
        status: "DRAFT",
        screens: {
          create: await Promise.all(
            body.screens.map(async (screen) => {
              // Calculate costs for this screen
              const priceBreakdown = calculateScreenPrice(
                screen.width,
                screen.height,
                screen.pixelPitch,
                screen.isOutdoor || false
              );

              // Create screen config with cost line items
              const margin = 0.25; // 25% margin

              return {
                name: screen.name,
                pixelPitch: screen.pixelPitch,
                width: screen.width,
                height: screen.height,
                lineItems: {
                  create: [
                    {
                      category: "LED",
                      cost: priceBreakdown.led,
                      margin: margin,
                      price: Math.round(priceBreakdown.led * (1 + margin)),
                    },
                    {
                      category: "Structure",
                      cost: priceBreakdown.structure,
                      margin: margin,
                      price: Math.round(priceBreakdown.structure * (1 + margin)),
                    },
                    {
                      category: "Installation",
                      cost: priceBreakdown.install,
                      margin: margin,
                      price: Math.round(priceBreakdown.install * (1 + margin)),
                    },
                    {
                      category: "Power",
                      cost: priceBreakdown.power,
                      margin: margin,
                      price: Math.round(priceBreakdown.power * (1 + margin)),
                    },
                  ],
                },
              };
            })
          ),
        },
      },
      include: {
        screens: {
          include: {
            lineItems: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        proposal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { error: "Failed to create proposal", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
