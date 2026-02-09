import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { updateWorkspaceSettings } from "@/lib/anything-llm";
import { findClientLogo } from "@/lib/brand-discovery";

export interface CreateWorkspaceRequest {
  name: string;
  userEmail: string;
  createInitialProposal?: boolean;
  clientName?: string;
  calculationMode?: "MIRROR" | "STRATEGIC";
  excelData?: {
    screens?: any[];
    receiverName?: string;
    proposalName?: string;
    internalAudit?: any;
    pricingDocument?: any;
    marginAnalysis?: any;
    pricingMode?: string;
    clientSummary?: any;
  };
}

/**
 * POST /api/workspaces/create
 * Creates a new workspace and an initial project (proposal)
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkspaceRequest = await request.json();

    // 1. DATA VALIDATION
    if (!body.name || !body.userEmail) {
      return NextResponse.json(
        { error: "MISSION CRITICAL: Project Name and User Identity are required." },
        { status: 400 }
      );
    }

    // NEW: Auto-discover client logo (Consultant Quick Win)
    const clientNameForLogo = body.excelData?.receiverName || body.clientName || body.name;
    const clientLogo = await findClientLogo(clientNameForLogo);

    // 2. PROJECT VAULT PERSISTENCE (Bulletproof)
    const workspace = await prisma.workspace.create({
      data: {
        name: body.name,
        clientLogo, // Store found logo
        users: {
          connectOrCreate: {
            where: { email: body.userEmail },
            create: { email: body.userEmail },
          },
        },
      },
    });

    let proposal: any = null;
    // Prompt 52: Diagnostic logging for project persistence
    console.log("[WORKSPACE/CREATE] Received:", {
      name: body.name,
      clientName: body.clientName,
      hasExcelData: !!body.excelData,
      screenCount: body.excelData?.screens?.length ?? 0,
      hasInternalAudit: !!body.excelData?.internalAudit,
      internalAuditKeys: body.excelData?.internalAudit ? Object.keys(body.excelData.internalAudit) : [],
      hasPricingDocument: !!body.excelData?.pricingDocument,
      hasClientSummary: !!body.excelData?.clientSummary,
      hasMarginAnalysis: !!body.excelData?.marginAnalysis,
    });
    if (body.createInitialProposal) {
      proposal = await prisma.proposal.create({
        data: {
          workspaceId: workspace.id,
          clientName: clientNameForLogo,
          clientLogo, // Store found logo here too
          status: "DRAFT",
          calculationMode: body.calculationMode === "MIRROR" ? "MIRROR" : "INTELLIGENCE",
          internalAudit: body.excelData?.internalAudit ? JSON.stringify(body.excelData.internalAudit) : undefined,
          clientSummary: body.excelData?.clientSummary ? JSON.stringify(body.excelData.clientSummary) : undefined,
          pricingDocument: body.excelData?.pricingDocument || undefined,
          marginAnalysis: body.excelData?.marginAnalysis || undefined,
          pricingMode: body.excelData?.pricingMode || undefined,
          screens: body.excelData?.screens ? {
            create: body.excelData.screens.map((screen: any) => ({
              name: screen.name || "Unnamed Screen",
              externalName: screen.externalName || null,
              group: screen.group || null,
              pixelPitch: Number(screen.pixelPitch || screen.pitchMm || 10),
              width: Number(screen.width || screen.widthFt || 0),
              height: Number(screen.height || screen.heightFt || 0),
              lineItems: {
                create: (screen.lineItems || []).map((li: any) => ({
                  category: li.category || "Other",
                  cost: Number(li.cost || 0),
                  margin: Number(li.margin || 0),
                  price: Number(li.price || 0),
                }))
              }
            }))
          } : undefined
        },
        include: {
          screens: {
            include: { lineItems: true }
          }
        }
      });
    }

    // 3. AI PROVISIONING (Background/Ferrari Mode)
    const provisionAI = async () => {
      if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) return;

      try {
        // Create Unique Slug based on Project ID and Name
        const safeName = body.name.toLowerCase().replace(/[^a-z0-0]/g, '-').slice(0, 20);
        const uniqueSlug = `${safeName}-${workspace.id.slice(-6)}`;

        // v1/workspace/new endpoint (ANYTHING_LLM_BASE_URL already includes /api/v1)
        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${ANYTHING_LLM_KEY}`
          },
          body: JSON.stringify({ name: uniqueSlug, chatMode: "chat" }),
        });

        if (res.ok) {
          const text = await res.text();
          let created: any;
          try {
            created = JSON.parse(text);
          } catch (e) {
            console.error("[Workspace/Create] AI provisioning returned non-JSON:", text.slice(0, 100));
            return;
          }
          const slug = created?.workspace?.slug || created?.slug;

          if (slug) {
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: { aiWorkspaceSlug: slug },
            });

            // If proposal exists, update its local aiWorkspaceSlug reference too
            if (proposal) {
              await prisma.proposal.update({
                where: { id: proposal.id },
                data: { aiWorkspaceSlug: slug },
              });
            }

            // 2. AUTOMATED CONFIGURATION
            // Do NOT set chatProvider/chatModel — leave them null so the workspace
            // inherits the system default from the AnythingLLM admin UI.
            // This way, changing the model in the admin UI applies to ALL workspaces.
            await updateWorkspaceSettings(slug, {
                openAiTemp: 0.2,
                chatMode: "chat",
            }).catch(e => console.error("AI Settings Provision Failed:", e));

            // 3. Provision Master Catalog (Background)
            const masterUrl = process.env.ANYTHING_LLM_MASTER_CATALOG_URL;
            if (masterUrl) {
              const { uploadLinkToWorkspace } = await import("@/lib/rag-sync");
              uploadLinkToWorkspace(slug, masterUrl).catch(console.error);
            }
          }
        }
      } catch (e) {
        console.error("[Workspace/Create] AI provisioning failed:", e instanceof Error ? e.message : e);
      }
    };

    // Kick off without blocking the UI redirect
    provisionAI();

    // 4. STRATEGIC HANDOFF
    return NextResponse.json(
      {
        success: true,
        workspace,
        proposal,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CRITICAL VAULT FAILURE:", error);
    return NextResponse.json(
      {
        error: "Database Persistence Failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
