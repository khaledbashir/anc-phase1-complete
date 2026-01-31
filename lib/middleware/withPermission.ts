/**
 * API Route Permission Middleware
 * 
 * Wraps API handlers to enforce RBAC permissions.
 * REQ-120: Strict enforcement of Permission Matrix (Table 2)
 */

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { Permission, hasPermission, UserRole } from "@/lib/rbac";

const prisma = new PrismaClient();

type ApiHandler = (
  req: NextRequest,
  context: { params: Promise<any>; user?: { id: string; role: UserRole } }
) => Promise<NextResponse>;

/**
 * Middleware to check user permissions before executing handler
 * 
 * Usage:
 * export const POST = withPermission("export:excel_audit", handler);
 */
export function withPermission(
  requiredPermission: Permission,
  handler: ApiHandler
): ApiHandler {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    try {
      // 1. Extract user from session/token (simplified - would use NextAuth in production)
      const userId = req.headers.get("x-user-id");
      
      if (!userId) {
        // No auth header - check if route allows anonymous
        // For now, default to VIEWER for public routes
        const user = { id: "anonymous", role: "VIEWER" as UserRole };
        
        if (!hasPermission(user.role, requiredPermission)) {
          return NextResponse.json(
            { error: `Access denied: Authentication required for '${requiredPermission}'` },
            { status: 401 }
          );
        }
        
        return handler(req, { ...context, user });
      }

      // 2. Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true }
      });

      if (!user) {
        return NextResponse.json(
          { error: "User not found" },
          { status: 401 }
        );
      }

      // 3. Check permission
      const userRole = user.role as UserRole;
      if (!hasPermission(userRole, requiredPermission)) {
        return NextResponse.json(
          { 
            error: `Access denied: ${userRole} role does not have '${requiredPermission}' permission`,
            requiredPermission,
            userRole 
          },
          { status: 403 }
        );
      }

      // 4. Execute handler with user context
      return handler(req, { ...context, user: { id: user.id, role: userRole } });
      
    } catch (error) {
      console.error("Permission middleware error:", error);
      return NextResponse.json(
        { error: "Authorization check failed" },
        { status: 500 }
      );
    }
  };
}

/**
 * Check multiple permissions (all required)
 */
export function withAllPermissions(
  permissions: Permission[],
  handler: ApiHandler
): ApiHandler {
  return async (req: NextRequest, context: { params: Promise<any> }) => {
    const userId = req.headers.get("x-user-id");
    
    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const userRole = user.role as UserRole;
    const missingPermissions = permissions.filter(p => !hasPermission(userRole, p));

    if (missingPermissions.length > 0) {
      return NextResponse.json(
        { 
          error: `Access denied: Missing permissions: ${missingPermissions.join(", ")}`,
          missingPermissions,
          userRole 
        },
        { status: 403 }
      );
    }

    return handler(req, { ...context, user: { id: user.id, role: userRole } });
  };
}
