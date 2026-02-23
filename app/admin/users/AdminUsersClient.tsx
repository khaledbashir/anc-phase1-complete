"use client";

import React, { useState } from "react";
import { Check, X, Lock, Users as UsersIcon, AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getRoleInfo, getPermissions, type UserRole, type Permission } from "@/lib/rbac";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  lastLogin: string | null;
}

interface AdminUsersClientProps {
  initialUsers: User[];
}

// Permission groupings for display
const PERMISSION_GROUPS = {
  Projects: ["workspace:create", "workspace:delete"] as Permission[],
  Proposals: ["proposal:create", "proposal:edit", "proposal:delete", "proposal:view"] as Permission[],
  "Rate Card": ["export:pdf", "export:excel_audit", "export:share_link"] as Permission[],
  "Product Catalog": ["view:costs", "view:margins", "view:selling_price", "view:internal_audit"] as Permission[],
  "Pricing Logic": ["branding:edit"] as Permission[],
  "Mirror Mode": [] as Permission[], // Placeholder
  "Intelligence Mode": ["ai:run_extraction", "ai:chat"] as Permission[],
  Finance: ["export:excel_audit"] as Permission[],
  Admin: [] as Permission[], // Placeholder for admin-only features
};

export default function AdminUsersClient({ initialUsers }: AdminUsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [selectedRole, setSelectedRole] = useState<{ userId: string; newRole: UserRole } | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  // Add user state
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", name: "", password: "", role: "VIEWER" as UserRole });
  const [isAdding, setIsAdding] = useState(false);

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.password) return;
    setIsAdding(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create user");
      }
      const { user } = await res.json();
      setUsers(prev => [...prev, { ...user, lastLogin: null }]);
      toast({ title: "User Created", description: `${user.email} added as ${getRoleInfo(user.role).label}` });
      setShowAddUser(false);
      setNewUser({ email: "", name: "", password: "", role: "VIEWER" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
    } finally {
      setIsAdding(false);
    }
  };

  const allRoles: UserRole[] = ["ADMIN", "ESTIMATOR", "PRODUCT_EXPERT", "PROPOSAL_LEAD", "FINANCE", "VIEWER", "OUTSIDER"];

  const roleStats = allRoles.reduce((acc, role) => {
    acc[role] = users.filter(u => u.role === role).length;
    return acc;
  }, {} as Record<UserRole, number>);

  const adminCount = roleStats.ADMIN || 0;

  const handleRoleChange = async () => {
    if (!selectedRole) return;

    setIsChanging(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedRole.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole.newRole }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update role");
      }

      const { user } = await res.json();

      // Update local state
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, role: user.role } : u)));

      toast({
        title: "Role Updated",
        description: `${user.name || user.email} is now ${getRoleInfo(user.role).label}`,
      });

      setSelectedRole(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "Could not update user role",
      });
    } finally {
      setIsChanging(false);
    }
  };

  const getPermissionsLost = (currentRole: UserRole, newRole: UserRole): string[] => {
    const current = getPermissions(currentRole);
    const next = getPermissions(newRole);
    const lost = current.filter(p => !next.includes(p));
    return lost;
  };

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Admins</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold">{adminCount}</div>
              {adminCount === 1 && (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            {adminCount === 1 && (
              <p className="text-xs text-amber-600 mt-1">Only 1 admin — consider adding a backup</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Estimators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.ESTIMATOR || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Viewers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleStats.VIEWER || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* User List Table */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user roles and permissions. Changes take effect immediately.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddUser(true)} size="sm" className="shrink-0">
            <Plus className="w-4 h-4 mr-1" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Current Role</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const roleInfo = getRoleInfo(user.role);
                  return (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-foreground">{user.name || "—"}</div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                      <td className="py-3 px-4">
                        <Select
                          value={user.role}
                          onValueChange={(newRole: UserRole) => {
                            setSelectedRole({ userId: user.id, newRole });
                          }}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {allRoles.map((role) => {
                              const info = getRoleInfo(role);
                              return (
                                <SelectItem key={role} value={role}>
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", `bg-${info.color}-500`)} />
                                    <span>{info.label}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "Never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Role Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Role Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allRoles.map((role) => {
            const info = getRoleInfo(role);
            const permissions = getPermissions(role);
            const userCount = roleStats[role] || 0;

            return (
              <Card key={role} className="relative overflow-hidden">
                <div className={cn("absolute top-0 left-0 right-0 h-1", `bg-${info.color}-500`)} />
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{info.label}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                      <UsersIcon className="w-3 h-3" />
                      {userCount}
                    </div>
                  </CardTitle>
                  <CardDescription className="text-xs">{info.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(PERMISSION_GROUPS).map(([module, perms]) => {
                      const hasAny = perms.some(p => permissions.includes(p));
                      const hasAll = perms.length > 0 && perms.every(p => permissions.includes(p));

                      // Skip empty groups
                      if (perms.length === 0) {
                        // Special cases
                        if (module === "Admin" && role === "ADMIN") {
                          return (
                            <div key={module} className="flex items-start gap-2 text-xs">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              <div>
                                <div className="font-medium">{module}</div>
                                <div className="text-muted-foreground">Manage Users, Manage Roles</div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }

                      return (
                        <div key={module} className="flex items-start gap-2 text-xs">
                          {hasAll ? (
                            <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          ) : hasAny ? (
                            <Check className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className={cn("font-medium", hasAny ? "" : "text-muted-foreground")}>
                              {module}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with email and password login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                placeholder="e.g., Natalia Kovaleva"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-email">Email *</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="e.g., natalia@anc.com"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-password">Password *</Label>
              <Input
                id="add-password"
                type="password"
                placeholder="At least 6 characters"
                value={newUser.password}
                onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(val: UserRole) => setNewUser(prev => ({ ...prev, role: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allRoles.map((role) => {
                    const info = getRoleInfo(role);
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", `bg-${info.color}-500`)} />
                          <span>{info.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUser(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={isAdding || !newUser.email || !newUser.password || newUser.password.length < 6}
            >
              {isAdding ? "Creating..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      {selectedRole && (
        <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role?</DialogTitle>
              <DialogDescription>
                {(() => {
                  const user = users.find(u => u.id === selectedRole.userId);
                  if (!user) return null;
                  const fromInfo = getRoleInfo(user.role);
                  const toInfo = getRoleInfo(selectedRole.newRole);
                  const lost = getPermissionsLost(user.role, selectedRole.newRole);

                  return (
                    <div className="space-y-4 pt-4">
                      <div>
                        Change <span className="font-semibold">{user.name || user.email}</span> from{" "}
                        <span className="font-semibold">{fromInfo.label}</span> to{" "}
                        <span className="font-semibold">{toInfo.label}</span>?
                      </div>

                      {lost.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="font-medium text-amber-900 dark:text-amber-100">
                                They will lose access to:
                              </div>
                              <ul className="mt-1 space-y-1 text-amber-800 dark:text-amber-200">
                                {lost.slice(0, 5).map(p => (
                                  <li key={p} className="text-xs">• {p.replace(/_/g, " ").replace(/:/g, " - ")}</li>
                                ))}
                                {lost.length > 5 && (
                                  <li className="text-xs">• ...and {lost.length - 5} more</li>
                                )}
                              </ul>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedRole(null)} disabled={isChanging}>
                Cancel
              </Button>
              <Button onClick={handleRoleChange} disabled={isChanging}>
                {isChanging ? "Changing..." : "Confirm Change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
