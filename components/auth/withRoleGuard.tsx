"use client";

import React from "react";
import { useSession } from "next-auth/react";
import Unauthorized from "@/app/components/reusables/Unauthorized";
import type { UserRole } from "@/lib/rbac";

/**
 * Higher-Order Component for role-based page protection
 *
 * Wraps a page component and shows <Unauthorized /> if user lacks required role
 *
 * @example
 * ```tsx
 * export default withRoleGuard(ProductsPage, ["ADMIN", "PRODUCT_EXPERT"]);
 * ```
 */
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  featureName?: string
) {
  return function ProtectedComponent(props: P) {
    const { data: session, status } = useSession();
    const userRole = (session?.user as any)?.role as UserRole | undefined;

    // Show loading state while checking session
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      );
    }

    // Check if user has required role
    const hasAccess = userRole && allowedRoles.includes(userRole);

    if (!hasAccess) {
      return (
        <Unauthorized
          allowedRoles={allowedRoles}
          featureName={featureName}
        />
      );
    }

    // User has access - render the protected component
    return <Component {...props} />;
  };
}
