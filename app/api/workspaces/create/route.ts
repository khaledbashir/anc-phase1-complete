import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface CreateWorkspaceRequest {
  name: string;
  userEmail: string;
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
