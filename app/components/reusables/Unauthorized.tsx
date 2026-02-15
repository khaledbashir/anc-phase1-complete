"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRoleInfo } from "@/lib/rbac";
import type { UserRole } from "@/lib/rbac";

interface UnauthorizedProps {
  /**
   * Array of roles that CAN access this feature
   */
  allowedRoles?: UserRole[];

  /**
   * Custom message to display (optional)
   */
  message?: string;

  /**
   * Custom feature name (e.g., "Product Catalog", "Rate Card")
   */
  featureName?: string;
}

/**
 * Unauthorized access component
 * Shows a clean card when user lacks permission to access a feature
 */
export default function Unauthorized({ allowedRoles, message, featureName }: UnauthorizedProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = (session?.user as any)?.role as UserRole | undefined;

  // Get role display info
  const currentRoleInfo = userRole ? getRoleInfo(userRole) : null;
  const allowedRoleLabels = allowedRoles?.map(role => getRoleInfo(role).label).join(", ");

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-xl font-semibold text-foreground">
              {message || "You don't have access to this"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {featureName && `This ${featureName} feature is restricted.`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Current Role */}
          {currentRoleInfo && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Your Current Role
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-${currentRoleInfo.color}-500`} />
                <span className="text-sm font-medium text-foreground">
                  {currentRoleInfo.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {currentRoleInfo.description}
              </p>
            </div>
          )}

          {/* Required Roles */}
          {allowedRoleLabels && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Required Role{allowedRoles && allowedRoles.length > 1 ? 's' : ''}
              </div>
              <p className="text-sm font-medium text-foreground">
                {allowedRoleLabels}
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground text-center">
            If you believe you should have access to this feature, please contact your administrator.
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
            >
              Go Back
            </Button>
            <Button
              onClick={() => router.push("/projects")}
              className="flex-1"
            >
              Go to Projects
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
