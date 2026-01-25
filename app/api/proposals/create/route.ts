import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateANCProject, ScreenInput } from "@/lib/estimator";

export interface CreateProposalRequest {
  workspaceId: string;
  clientName: string;
  // accept screens in the same shape as ScreenInput but allow legacy names
  screens: Array<Partial<ScreenInput> & {
    name: string;
    // legacy fields still accepted:
    pixelPitch?: number; // mm
    width?: number; // ft
    height?: number; // ft
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

    // Convert incoming screens to the estimator's ScreenInput shape
    const screenInputs: ScreenInput[] = body.screens.map((s) => ({
      name: s.name,
      productType: s.productType ?? "Unknown",
      heightFt: (s.height ?? s.heightFt) ?? 0,
      widthFt: (s.width ?? s.widthFt) ?? 0,
      quantity: s.quantity ?? 1,
      pitchMm: (s.pixelPitch ?? s.pitchMm) ?? undefined,
      costPerSqFt: s.costPerSqFt,
      desiredMargin: s.desiredMargin,
    }));

    // Run estimator for all screens
    const estimatorResult = calculateANCProject(screenInputs);

    // Create the proposal with nested screens and line items based on estimator
    const proposal = await prisma.proposal.create({
      data: {
        workspaceId: body.workspaceId,
        clientName: body.clientName,
        status: "DRAFT",
        screens: {
          create: await Promise.all(
            estimatorResult.items.map(async (item, idx) => {
              const input = screenInputs[idx];
              const desiredMargin = input.desiredMargin ?? 0.25;

              // Build line items
              const lineItemsData = [
                { category: "Hardware", cost: roundToCents(item.hardware), margin: desiredMargin, price: roundToCents(item.hardware * (1 + desiredMargin)) },
                { category: "Shipping", cost: roundToCents(item.shipping), margin: desiredMargin, price: roundToCents(item.shipping * (1 + desiredMargin)) },
                { category: "Labor", cost: roundToCents(item.labor), margin: desiredMargin, price: roundToCents(item.labor * (1 + desiredMargin)) },
                { category: "PM", cost: roundToCents(item.pm), margin: desiredMargin, price: roundToCents(item.pm * (1 + desiredMargin)) },
                { category: "Bond", cost: roundToCents(item.bond), margin: 0, price: roundToCents(item.bond) },
              ];

              return {
                name: item.name,
                pixelPitch: input.pitchMm ?? 0,
                width: input.widthFt ?? 0,
                height: input.heightFt ?? 0,
                lineItems: {
                  create: lineItemsData.map(li => ({
                    category: li.category,
                    cost: li.cost,
                    margin: li.margin,
                    price: li.price,
                  })),
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

function roundToCents(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
