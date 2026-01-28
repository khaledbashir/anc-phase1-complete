import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import type { Workspace, User } from "@prisma/client";

// Define the intersection type that includes the users relation
type WorkspaceWithUsers = Workspace & {
  users: User[];
};

export interface CreateWorkspaceRequest {
  name: string;
  userEmail: string;
  createInitialProposal?: boolean;
  clientName?: string;
}

/**
 * POST /api/workspaces/create
 * Creates a new workspace with an initial user
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateWorkspaceRequest = await request.json();

    // Validate required fields
    if (!body.name || !body.userEmail) {
      return NextResponse.json(
        { error: "Missing required fields: name or userEmail" },
        { status: 400 }
      );
    }

    // Create workspace with first user
    let workspace: WorkspaceWithUsers = await prisma.workspace.create({
      data: {
        name: body.name,
        users: {
          create: {
            email: body.userEmail,
          },
        },
      },
      include: {
        users: true,
      },
    });

    let proposal: any = null;
    let aiInfo: any = null;

    // Provision AnythingLLM workspace with Natalia's EXPERT SETTINGS
    try {
      if (ANYTHING_LLM_BASE_URL && ANYTHING_LLM_KEY) {
        const uniqueSuffix = Date.now().toString(36).slice(-4);
        const wsName = `${body.name} - ANC Project Room (${uniqueSuffix})`;

        const payload = {
          name: wsName,
          similarityThreshold: 0.2, // Catch diverse RFP wording
          openAiTemp: 0.1,         // Precision for spec extraction
          openAiHistory: 10,
          chatMode: "chat",
          topN: 10,                 // High transparency for dense RFP sections
          openAiPrompt: `
            YOU ARE THE ANC STRATEGIC ESTIMATOR (Master Protocol).
            Your mission is to build high-stakes LED signatures.
            
            CORE RULES:
            1. FORMULAS: Structure=20% (Ribbons/Top=10%), Labor=15%, Power=15%, PM=$0.50/sqft, Shipping=$0.14/sqft.
            2. BOND: Final totals must include 1.5% Bond on Top of everything.
            3. FERRARI LOGIC: Look for 'Spare Parts' (5% Hardware) and 'Existing Infrastructure' (Structure drops to 5%).
            4. PRECISION: If an RFP section is ambiguous, ask for clarification.
            5. FORMAT: Always prioritize technical accuracy over conversational filler.
          `.trim(),
        };

        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const created = await res.json();
          const slug = created?.workspace?.slug || created?.slug || null;

          if (slug) {
            aiInfo = { slug };
            // Update workspace with slug
            workspace = await prisma.workspace.update({
              where: { id: workspace.id },
              data: { aiWorkspaceSlug: slug },
              include: { users: true },
            });

            // Upload master catalog (Global Knowledge Base)
            const masterUrl = process.env.ANYTHING_LLM_MASTER_CATALOG_URL;
            if (masterUrl) {
              try {
                const { uploadLinkToWorkspace } = await import("@/lib/rag-sync");
                await uploadLinkToWorkspace(slug, masterUrl);
              } catch (e) {
                console.warn("Failed to upload master catalog", e);
              }
            }

            // Create thread if requested
            if (body.createInitialProposal && body.clientName) {
              const threadRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${slug}/thread/new`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
                body: JSON.stringify({ title: `Project Kickoff: ${body.clientName}` }),
              });
              const threadData = await threadRes.json();
              aiInfo.threadId = threadData?.thread?.slug || null;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Provisioning AnythingLLM failed:", e);
    }

    // ALWAYS create proposal if requested, regardless of AI success
    if (body.createInitialProposal && body.clientName) {
      try {
        proposal = await prisma.proposal.create({
          data: {
            workspaceId: workspace.id,
            clientName: body.clientName,
            status: "DRAFT",
            aiThreadId: aiInfo?.threadId || null,
          },
        });
      } catch (e) {
        console.error("Failed to create initial proposal:", e);
      }
    }

    return NextResponse.json(
      {
        success: true,
        workspace,
        proposal,
        ai: aiInfo
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { error: "Failed to create workspace", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
