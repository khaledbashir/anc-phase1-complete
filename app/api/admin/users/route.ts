import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/rbac";

/**
 * GET /api/admin/users
 * Fetch all users with their roles
 * ADMIN only
 */
export async function GET() {
  try {
    const session = await auth();
    const userRole = (session?.user as any)?.role as UserRole | undefined;

    // Only ADMIN can list users
    if (userRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Only admins can list users" },
        { status: 403 }
      );
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        authRole: true,
        emailVerified: true,
        sessions: {
          select: {
            expires: true,
          },
          orderBy: {
            expires: "desc",
          },
          take: 1,
        },
      },
      orderBy: { email: "asc" },
    });

    // Format response with last login
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authRole: user.authRole,
      emailVerified: user.emailVerified,
      lastLogin: user.sessions[0]?.expires
        ? new Date(user.sessions[0].expires).toISOString()
        : null,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("[GET /api/admin/users] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
