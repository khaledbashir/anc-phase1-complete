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

    // 1. PERSISTENCE FIRST: Create local DB records immediately
    const workspace = await prisma.workspace.create({
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
    if (body.createInitialProposal && body.clientName) {
      proposal = await prisma.proposal.create({
        data: {
          workspaceId: workspace.id,
          clientName: body.clientName,
          status: "DRAFT",
        },
      });
    }

    // 2. BACKGROUND PROVISIONING: Do not block the user's redirect!
    // We initiate the AI provisioning but we don't 'await' it for the final response.
    // This gives the user that 'Ferrari' speed.
    const provisionAI = async () => {
      if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) return;

      try {
        const uniqueSuffix = Date.now().toString(36).slice(-4);
        const wsName = `${body.name} - ANC Project Room (${uniqueSuffix})`;

        const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
          body: JSON.stringify({ name: wsName }),
        });

        if (res.ok) {
          const created = await res.json();
          const slug = created?.workspace?.slug || created?.slug;
          if (slug) {
            await prisma.workspace.update({
              where: { id: workspace.id },
              data: { aiWorkspaceSlug: slug },
            });

            // Trigger Catalog Sync in background
            const masterUrl = process.env.ANYTHING_LLM_MASTER_CATALOG_URL;
            if (masterUrl) {
              const { uploadLinkToWorkspace } = await import("@/lib/rag-sync");
              uploadLinkToWorkspace(slug, masterUrl).catch(console.error);
            }

            // Create Thread in background
            if (proposal) {
              const threadRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${slug}/thread/new`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
                body: JSON.stringify({ title: `Project Kickoff: ${body.clientName}` }),
              });
              const threadData = await threadRes.json();
              const threadId = threadData?.thread?.slug;
              if (threadId) {
                await prisma.proposal.update({
                  where: { id: proposal.id },
                  data: { aiThreadId: threadId },
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn("Background AI provisioning failed:", e);
      }
    };

    // Kick off provisioning without awaiting
    provisionAI();

    // 3. IMMEDIATE RESPONSE: User redirects to the project page NOW
    return NextResponse.json(
      {
        success: true,
        workspace,
        proposal,
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
