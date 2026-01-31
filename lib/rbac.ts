/**
 * Role-Based Access Control (RBAC) - PRD Section 2, Table 2
 * 
 * Enforces strict permission matrix for all user roles.
 * REQ-120: Finance restricted to Internal Audit Excel only
 * REQ-117: Outsider (Subcontractor) blocked from margins/costs/totals
 */

export type UserRole = 
  | "ADMIN" 
  | "ESTIMATOR" 
  | "FINANCE" 
  | "VIEWER" 
  | "OUTSIDER";

export type Permission = 
  // Workspace
  | "workspace:create"
  | "workspace:delete"
  // Proposal
  | "proposal:create"
  | "proposal:edit"
  | "proposal:delete"
  | "proposal:view"
  // Exports
  | "export:pdf"
  | "export:excel_audit"
  | "export:share_link"
  // Financial Data
  | "view:costs"
  | "view:margins"
  | "view:selling_price"
  | "view:internal_audit"
  // Branding
  | "branding:edit"
  // AI
  | "ai:run_extraction"
  | "ai:chat";

/**
 * Permission Matrix (PRD Table 2)
 * 
 * ADMIN: Full access
 * ESTIMATOR: Edit proposals, run AI, all exports
 * FINANCE: View costs, Internal Audit Excel ONLY, no branding
 * VIEWER: Read-only
 * OUTSIDER: Specs only - NO costs, margins, or totals
 */
const PERMISSION_MATRIX: Record<UserRole, Permission[]> = {
  ADMIN: [
    "workspace:create",
    "workspace:delete",
    "proposal:create",
    "proposal:edit",
    "proposal:delete",
    "proposal:view",
    "export:pdf",
    "export:excel_audit",
    "export:share_link",
    "view:costs",
    "view:margins",
    "view:selling_price",
    "view:internal_audit",
    "branding:edit",
    "ai:run_extraction",
    "ai:chat",
  ],
  
  ESTIMATOR: [
    // PRD Table 2: Estimator CAN create workspaces (to initiate new bids)
    "workspace:create",        // ✅ Can create new project workspaces
    // ❌ BLOCKED: workspace:delete, branding:edit (Admin only)
    "proposal:create",
    "proposal:edit",
    "proposal:view",
    // ❌ BLOCKED: proposal:delete (Admin only)
    "export:pdf",
    "export:excel_audit",
    "export:share_link",
    "view:costs",
    "view:margins",
    "view:selling_price",
    "view:internal_audit",
    "ai:run_extraction",
    "ai:chat",
  ],
  
  FINANCE: [
    // REQ-120: Finance can ONLY generate Internal Audit Excel
    "proposal:view",
    "export:excel_audit",      // ✅ Allowed
    "view:costs",              // ✅ Can see costs
    "view:margins",            // ✅ Can see margins
    "view:selling_price",      // ✅ Can see selling price
    "view:internal_audit",     // ✅ Can see internal audit
    // ❌ NO: workspace:create, branding:edit, export:pdf, export:share_link
  ],
  
  VIEWER: [
    "proposal:view",
    "view:selling_price",      // Can see final prices
    // ❌ NO: costs, margins, internal audit, exports
  ],
  
  OUTSIDER: [
    // REQ-117: Subcontractor sees SPECS ONLY
    "proposal:view",
    // ❌ BLOCKED: costs, margins, selling_price, internal_audit
    // They see technical specs but NO financial data
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = PERMISSION_MATRIX[role] || [];
  return permissions.includes(permission);
}

/**
 * Check multiple permissions (all must be true)
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

/**
 * Check multiple permissions (at least one must be true)
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: UserRole): Permission[] {
  return PERMISSION_MATRIX[role] || [];
}

/**
 * Validate action and throw if unauthorized
 */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Access denied: ${role} role does not have '${permission}' permission`);
  }
}

/**
 * Sanitize proposal data based on role
 * REQ-117: Outsiders cannot see financial data
 */
export function sanitizeForRole<T extends Record<string, any>>(data: T, role: UserRole): T {
  const sanitized: any = { ...data };
  
  // Outsiders: Strip ALL financial data
  if (role === "OUTSIDER") {
    if (sanitized.details) {
      sanitized.details = { ...sanitized.details };
      // Remove financial fields
      delete sanitized.details.internalAudit;
      delete sanitized.details.totalAmount;
      delete sanitized.details.subTotal;
      
      // Strip costs/margins from screens
      if (sanitized.details.screens) {
        sanitized.details.screens = sanitized.details.screens.map((s: any) => ({
          ...s,
          lineItems: s.lineItems?.map((li: any) => ({
            category: li.category,
            // ❌ NO price, cost, or margin
          })),
          sellPrice: undefined,
          finalClientTotal: undefined,
          internalAudit: undefined,
        }));
      }
    }
  }
  
  // Viewers: Can see prices but not costs/margins
  if (role === "VIEWER") {
    if (sanitized.details?.screens) {
      sanitized.details.screens = sanitized.details.screens.map((s: any) => ({
        ...s,
        lineItems: s.lineItems?.map((li: any) => ({
          category: li.category,
          price: li.price,
          // ❌ NO cost or margin
        })),
        internalAudit: undefined,
      }));
    }
    delete sanitized.details?.internalAudit;
  }
  
  return sanitized;
}

/**
 * Role display info for UI
 */
export function getRoleInfo(role: UserRole): {
  label: string;
  description: string;
  color: string;
} {
  const info: Record<UserRole, { label: string; description: string; color: string }> = {
    ADMIN: {
      label: "Administrator",
      description: "Full system access including workspace management and branding",
      color: "red",
    },
    ESTIMATOR: {
      label: "Estimator",
      description: "Create and edit proposals, run AI extraction, generate all exports",
      color: "blue",
    },
    FINANCE: {
      label: "Finance",
      description: "View costs and margins, generate Internal Audit Excel only",
      color: "green",
    },
    VIEWER: {
      label: "Viewer",
      description: "Read-only access to proposals and final prices",
      color: "gray",
    },
    OUTSIDER: {
      label: "Subcontractor",
      description: "Technical specs only - no access to pricing or margins",
      color: "orange",
    },
  };
  return info[role];
}
