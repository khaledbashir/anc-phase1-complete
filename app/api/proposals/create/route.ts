import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateANCProject, calculateProposalAudit, ScreenInput } from "@/lib/estimator";

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
      serviceType: s.serviceType,
      formFactor: s.formFactor,
      outletDistance: s.outletDistance,
    }));

    // Run deterministic audit for all screens (includes client summary + internal audit)
    const audit = calculateProposalAudit(screenInputs);

    // Create the proposal with nested screens and line items based on audit (persisting audit JSON)
    const proposal = await prisma.proposal.create({
      data: {
        workspaceId: body.workspaceId,
        clientName: body.clientName,
        status: "DRAFT",
        internalAudit: audit.internalAudit,
        clientSummary: audit.clientSummary,
        screens: {
          create: await Promise.all(
            audit.internalAudit.perScreen.map(async (screenAudit, idx) => {
              const input = screenInputs[idx];
              const desiredMargin = input.desiredMargin ?? 0.25;

              // Build line items
              const li = screenAudit.breakdown;
              const lineItemsData = [
                { category: "Hardware", cost: String(li.hardware), margin: String(desiredMargin), price: String(roundToCents(li.hardware * (1 + desiredMargin))) },
                { category: "Structure", cost: String(li.structure), margin: String(desiredMargin), price: String(roundToCents(li.structure * (1 + desiredMargin))) },
                { category: "Install", cost: String(li.install), margin: String(desiredMargin), price: String(roundToCents(li.install * (1 + desiredMargin))) },
                { category: "Power", cost: String(li.power), margin: String(desiredMargin), price: String(roundToCents(li.power * (1 + desiredMargin))) },
                { category: "Shipping", cost: String(li.shipping), margin: String(desiredMargin), price: String(roundToCents(li.shipping * (1 + desiredMargin))) },
                { category: "Labor", cost: String(li.labor), margin: String(desiredMargin), price: String(roundToCents(li.labor * (1 + desiredMargin))) },
                { category: "PM", cost: String(li.pm), margin: String(desiredMargin), price: String(roundToCents(li.pm * (1 + desiredMargin))) },
                { category: "General Conditions", cost: String(li.generalConditions), margin: String(desiredMargin), price: String(roundToCents(li.generalConditions * (1 + desiredMargin))) },
                { category: "Travel", cost: String(li.travel), margin: String(desiredMargin), price: String(roundToCents(li.travel * (1 + desiredMargin))) },
                { category: "Submittals", cost: String(li.submittals), margin: String(desiredMargin), price: String(roundToCents(li.submittals * (1 + desiredMargin))) },
                { category: "Engineering", cost: String(li.engineering), margin: String(desiredMargin), price: String(roundToCents(li.engineering * (1 + desiredMargin))) },
                { category: "Permits", cost: String(li.permits), margin: String(desiredMargin), price: String(roundToCents(li.permits * (1 + desiredMargin))) },
                { category: "CMS", cost: String(li.cms), margin: String(desiredMargin), price: String(roundToCents(li.cms * (1 + desiredMargin))) },
                { category: "Bond", cost: String(li.bondCost), margin: String(0), price: String(li.bondCost) },
                { category: "ANC Margin", cost: String(0), margin: String(0), price: String(li.ancMargin) },
              ];

              return {
                name: screenAudit.name,
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
