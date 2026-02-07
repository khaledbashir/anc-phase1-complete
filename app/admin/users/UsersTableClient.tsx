"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createUser, updateUserRole, deleteUser } from "@/app/actions/users";
import { Pencil, Trash2, Plus, Shield, FileSpreadsheet, Eye, Loader2, AlertCircle } from "lucide-react";

type RoleOption = "admin" | "estimator" | "proposal_team";

const ROLES: Record<RoleOption, {
  label: string;
  permissions: string;
  color: string;
  bg: string;
  icon: typeof Shield;
}> = {
  admin: {
    label: "Admin",
    permissions: "Full access — users, proposals, settings",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    icon: Shield,
  },
  estimator: {
    label: "Estimator",
    permissions: "Create, edit proposals, upload Excel, PDFs",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    icon: FileSpreadsheet,
  },
  proposal_team: {
    label: "Proposal Team",
    permissions: "View, share with clients, request changes",
    color: "text-zinc-900",
    bg: "bg-zinc-100",
    icon: Eye,
  },
};

type UserRow = { id: string; email: string; name: string | null; authRole: string | null };

function RoleSelector({ value, onChange }: { value: RoleOption; onChange: (r: RoleOption) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-zinc-700">Role</Label>
      <div className="space-y-1.5">
        {(Object.keys(ROLES) as RoleOption[]).map((key) => {
          const role = ROLES[key];
          const isActive = value === key;
          const Icon = role.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-all ${
                isActive
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-zinc-900" : "text-zinc-400"}`} />
              <div className="flex-1 min-w-0">
                <span className={`font-medium ${isActive ? "text-zinc-900" : "text-zinc-600"}`}>{role.label}</span>
                <span className="text-zinc-400 ml-1.5">—</span>
                <span className="text-zinc-400 ml-1.5 text-xs">{role.permissions}</span>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                isActive ? "border-zinc-900" : "border-zinc-300"
              }`}>
                {isActive && <div className="w-2 h-2 rounded-full bg-zinc-900" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function UsersTableClient({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<RoleOption>("estimator");
  const [createError, setCreateError] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<RoleOption>("estimator");
  const [editPending, setEditPending] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setCreatePending(true);
    try {
      await createUser(createEmail, createPassword, createRole);
      setCreateOpen(false);
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("estimator");
      router.refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setCreatePending(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editUserId) return;
    setEditPending(true);
    try {
      await updateUserRole(editUserId, editRole);
      setEditUserId(null);
      router.refresh();
    } finally {
      setEditPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    setDeletePending(true);
    try {
      await deleteUser(deleteUserId);
      setDeleteUserId(null);
      router.refresh();
    } finally {
      setDeletePending(false);
    }
  };

  const getRoleOption = (r: string | null): RoleOption =>
    r === "admin" || r === "estimator" || r === "proposal_team" ? r : "estimator";

  const getInitial = (user: UserRow) =>
    (user.name?.[0] || user.email[0] || "?").toUpperCase();

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-zinc-900">Team</h1>
          <p className="text-sm text-zinc-500">{users.length} members</p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          size="sm"
          className="h-9 px-3 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add member
        </Button>
      </div>

      {/* Table */}
      <div className="border border-zinc-200 rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_140px_80px] px-4 py-2.5 bg-zinc-50 border-b border-zinc-200">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Member</span>
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Role</span>
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Actions</span>
        </div>

        {/* Rows */}
        {users.map((u, i) => {
          const roleKey = getRoleOption(u.authRole);
          const role = ROLES[roleKey];
          const Icon = role.icon;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
              className="group grid grid-cols-[1fr_140px_80px] items-center px-4 py-3 border-b border-zinc-100 last:border-b-0 hover:bg-zinc-50/50 transition-colors"
            >
              {/* Member */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-semibold text-zinc-600 shrink-0">
                  {getInitial(u)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{u.email}</p>
                  <p className="text-xs text-zinc-400 truncate">{role.permissions}</p>
                </div>
              </div>

              {/* Role badge */}
              <div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700">
                  <Icon className="h-3 w-3" />
                  {role.label}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => { setEditUserId(u.id); setEditRole(getRoleOption(u.authRole)); }}
                  className="p-1.5 rounded text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setDeleteUserId(u.id)}
                  className="p-1.5 rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Add team member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">Email</Label>
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">Password</Label>
                <Input
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                  required
                  className="h-9 text-sm"
                />
              </div>
              <RoleSelector value={createRole} onChange={setCreateRole} />
              {createError && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {createError}
                </div>
              )}
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createPending} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                {createPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Creating...</> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Role Dialog */}
      <Dialog open={!!editUserId} onOpenChange={(open) => !open && setEditUserId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Change role</DialogTitle>
            <p className="text-sm text-zinc-500">{users.find((u) => u.id === editUserId)?.email}</p>
          </DialogHeader>
          <div className="py-3">
            <RoleSelector value={editRole} onChange={setEditRole} />
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setEditUserId(null)}>Cancel</Button>
            <Button size="sm" onClick={handleUpdateRole} disabled={editPending} className="bg-zinc-900 hover:bg-zinc-800 text-white">
              {editPending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Remove member</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-zinc-700">{users.find((u) => u.id === deleteUserId)?.email}</span> will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 text-white hover:bg-red-700" onClick={handleDelete}>
              {deletePending ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Removing...</> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
