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

    // Provision AnythingLLM workspace synchronously
    try {
      if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) throw new Error("AnythingLLM not configured");

      const payload = {
        name: `${body.name} - ANC Project Room`,
        similarityThreshold: 0.2,
        openAiTemp: 0.3,
        chatMode: "chat",
        topN: 5,
        openAiPrompt:
          "You are the ANC Strategic Estimator. Mission: Build high-stakes LED proposals for Natalia. 1. Use RAG for product specs (mm pitch, cabinet weight). 2. Formulas: Structure=20% of hardware, Labor=15%. 3. If specs are missing, trigger INCOMPLETE_SPECS. 4. Always emit JSON actions.",
      };

      const res = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANYTHING_LLM_KEY}` },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let created: any;
      try {
        created = JSON.parse(text);
      } catch (e) {
        created = null;
      }

      const slug = created?.workspace?.slug || created?.slug || null;

      if (slug) {
        // Update workspace with slug
        workspace = await prisma.workspace.update({ 
          where: { id: workspace.id }, 
          data: { aiWorkspaceSlug: slug },
          include: { users: true },
        });

        // Upload master catalog if available
        const masterUrl = process.env.ANYTHING_LLM_MASTER_CATALOG_URL;
        if (masterUrl) {
          try {
            const { uploadLinkToWorkspace } = await import("@/lib/rag-sync");
            await uploadLinkToWorkspace(slug, masterUrl);
          } catch (e) {
            console.warn("Failed to upload master catalog to workspace", e);
          }
        }

        // If requested, create an initial proposal and thread
        if (body.createInitialProposal && body.clientName) {
          try {
            // Create thread
            const threadRes = await fetch(`${base}/workspace/${slug}/thread/new`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
              body: JSON.stringify({ title: `${body.clientName} - Initial Proposal Thread` }),
            });
            const threadText = await threadRes.text();
            let threadJson: any;
            try {
              threadJson = JSON.parse(threadText);
            } catch (e) {
              threadJson = null;
            }
            const threadId = threadJson?.thread?.id || threadJson?.id || null;

            // Create a minimal proposal row attached to the workspace
            const proposal = await prisma.proposal.create({
              data: {
                workspaceId: workspace.id,
                clientName: body.clientName,
                status: "DRAFT",
                aiThreadId: threadId ?? undefined,
              },
            });

            return NextResponse.json({ success: true, workspace, proposal, ai: { slug, threadId } }, { status: 201 });
          } catch (e) {
            console.warn("Failed to create initial thread or proposal", e);
            return NextResponse.json({ success: true, workspace, ai: { slug } }, { status: 201 });
          }
        }
      }
    } catch (e) {
      console.warn("Provisioning failed:", e);
      // Continue: return workspace without ai info
    }

    return NextResponse.json(
      {
        success: true,
        workspace,
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
