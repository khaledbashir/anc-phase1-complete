import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/rbac";

/**
 * PATCH /api/admin/users/[id]
 * Update user's role
 * ADMIN only
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role as UserRole | undefined;
    const currentUserId = (session?.user as any)?.id;

    // Only ADMIN can update user roles
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can update user roles" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { role } = body as { role: UserRole };

    // Validate role
    const validRoles: UserRole[] = [
      "ADMIN",
      "ESTIMATOR",
      "PRODUCT_EXPERT",
      "PROPOSAL_LEAD",
      "FINANCE",
      "VIEWER",
      "OUTSIDER",
    ];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role", message: `Role must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Prevent admin from demoting themselves if they're the last admin
    if (id === currentUserId && role !== "ADMIN") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN" },
      });

      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: "Cannot demote last admin",
            message: "You are the last admin. Promote another user to admin before changing your role.",
          },
          { status: 400 }
        );
      }
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authRole: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    const { id } = await params;
    console.error(`[PATCH /api/admin/users/${id}] Error:`, error);

    if (error.code === "P2025") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
