"use client";

import { useSession } from "next-auth/react";
import { hasPermission as checkPermission } from "@/lib/rbac";
import type { UserRole, Permission } from "@/lib/rbac";

/**
 * Client-side RBAC hook
 *
 * Reads user's role from NextAuth session and provides permission checks
 *
 * @example
 * ```tsx
 * const { hasPermission, hasRole, userRole } = useRbac();
 *
 * if (hasPermission("proposal:create")) {
 *   // Show create button
 * }
 *
 * if (hasRole(["ADMIN", "ESTIMATOR"])) {
 *   // Show admin/estimator features
 * }
 * ```
 */
export function useRbac() {
  const { data: session, status } = useSession();
  const user = session?.user as { role?: UserRole } | undefined;
  const userRole = user?.role || "VIEWER"; // Default to most restrictive
  const isLoading = status === "loading";

  /**
   * Check if current user has a specific permission
   */
  const hasPermission = (permission: Permission): boolean => {
    if (isLoading) return false;
    return checkPermission(userRole, permission);
  };

  /**
   * Check if current user has one of the specified roles
   */
  const hasRole = (roles: UserRole[]): boolean => {
    if (isLoading) return false;
    return roles.includes(userRole);
  };

  /**
   * Check if user is admin (convenience helper)
   */
  const isAdmin = (): boolean => {
    if (isLoading) return false;
    return userRole === "ADMIN";
  };

  return {
    /** Current user's role */
    userRole,
    /** Check if user has a specific permission */
    hasPermission,
    /** Check if user has one of the specified roles */
    hasRole,
    /** Check if user is admin */
    isAdmin,
    /** Whether session is still loading */
    isLoading,
  };
}
