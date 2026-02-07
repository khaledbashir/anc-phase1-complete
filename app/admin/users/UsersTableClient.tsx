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
import { Pencil, Trash2, UserPlus, Shield, FileSpreadsheet, Eye, Loader2, AlertCircle } from "lucide-react";

// ── Role Config ──
type RoleOption = "admin" | "estimator" | "proposal_team";

const ROLES: Record<RoleOption, {
  label: string;
  description: string;
  permissions: string;
  color: string;
  bgLight: string;
  borderActive: string;
  icon: typeof Shield;
}> = {
  admin: {
    label: "Admin",
    description: "Full system access",
    permissions: "Manage users, all proposals, settings, billing",
    color: "text-[#0A52EF]",
    bgLight: "bg-[#0A52EF]/10",
    borderActive: "border-[#0A52EF] bg-[#0A52EF]/5",
    icon: Shield,
  },
  estimator: {
    label: "Estimator",
    description: "Create & edit proposals",
    permissions: "Upload Excel, build quotes, generate PDFs, edit pricing",
    color: "text-emerald-600",
    bgLight: "bg-emerald-50",
    borderActive: "border-emerald-500 bg-emerald-50",
    icon: FileSpreadsheet,
  },
  proposal_team: {
    label: "Proposal Team",
    description: "Review & share proposals",
    permissions: "View proposals, share with clients, request changes",
    color: "text-violet-600",
    bgLight: "bg-violet-50",
    borderActive: "border-violet-500 bg-violet-50",
    icon: Eye,
  },
};

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  authRole: string | null;
};

// ── Role Selector Cards ──
function RoleSelector({ value, onChange }: { value: RoleOption; onChange: (r: RoleOption) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-zinc-700">Role</Label>
      <div className="grid gap-3">
        {(Object.keys(ROLES) as RoleOption[]).map((key) => {
          const role = ROLES[key];
          const isActive = value === key;
          const Icon = role.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all duration-200 ${
                isActive
                  ? role.borderActive
                  : "border-zinc-200 hover:border-zinc-300 bg-white"
              }`}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${role.bgLight}`}>
                <Icon className={`h-4 w-4 ${role.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm ${isActive ? role.color : "text-zinc-900"}`}>
                  {role.label}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">{role.permissions}</div>
              </div>
              <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                isActive ? "border-[#0A52EF]" : "border-zinc-300"
              }`}>
                {isActive && <div className="w-2 h-2 rounded-full bg-[#0A52EF]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ──
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
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl font-bold text-zinc-900 tracking-tight">
            Team
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            {users.length} member{users.length !== 1 ? "s" : ""} with access to the proposal engine
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="h-11 px-5 rounded-lg bg-[#0A52EF] hover:bg-[#0385DD] text-white font-semibold transition-all duration-300 hover:-translate-y-[1px]"
          style={{ boxShadow: "0 8px 20px -5px rgba(10, 82, 239, 0.25)" }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* ── User Cards ── */}
      <div className="space-y-3">
        {users.map((u, i) => {
          const roleKey = getRoleOption(u.authRole);
          const role = ROLES[roleKey];
          const Icon = role.icon;
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="group relative flex items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all duration-300"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${role.bgLight} ${role.color}`}>
                {getInitial(u)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span className="font-medium text-zinc-900 truncate">{u.email}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${role.bgLight} ${role.color}`}>
                    <Icon className="h-3 w-3" />
                    {role.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">{role.permissions}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={() => {
                    setEditUserId(u.id);
                    setEditRole(getRoleOption(u.authRole));
                  }}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteUserId(u.id)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Bottom glow on hover */}
              <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-[#0A52EF]/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
            </motion.div>
          );
        })}
      </div>

      {/* ── Create User Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold tracking-tight">
              Invite a team member
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-5 py-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-zinc-700">Email address</Label>
                <Input
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="colleague@anc.com"
                  required
                  className="h-12 rounded-lg border-zinc-200 bg-zinc-50/50 text-base px-4 focus-visible:ring-[#0A52EF]/30 focus-visible:border-[#0A52EF] transition-all duration-200"
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
                  className="h-12 rounded-lg border-zinc-200 bg-zinc-50/50 text-base px-4 focus-visible:ring-[#0A52EF]/30 focus-visible:border-[#0A52EF] transition-all duration-200"
                />
              </div>
              <RoleSelector value={createRole} onChange={setCreateRole} />
              {createError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {createError}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPending}
                className="rounded-lg bg-[#0A52EF] hover:bg-[#0385DD] text-white font-semibold transition-all duration-300"
                style={{ boxShadow: "0 6px 16px -4px rgba(10, 82, 239, 0.3)" }}
              >
                {createPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</>
                ) : (
                  "Create User"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role Dialog ── */}
      <Dialog open={!!editUserId} onOpenChange={(open) => !open && setEditUserId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl font-bold tracking-tight">
              Change role
            </DialogTitle>
            <p className="text-sm text-zinc-500 mt-1">
              {users.find((u) => u.id === editUserId)?.email}
            </p>
          </DialogHeader>
          <div className="py-4">
            <RoleSelector value={editRole} onChange={setEditRole} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserId(null)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateRole}
              disabled={editPending}
              className="rounded-lg bg-[#0A52EF] hover:bg-[#0385DD] text-white font-semibold transition-all duration-300"
              style={{ boxShadow: "0 6px 16px -4px rgba(10, 82, 239, 0.3)" }}
            >
              {editPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif text-xl font-bold tracking-tight">
              Remove team member
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium text-zinc-700">
                {users.find((u) => u.id === deleteUserId)?.email}
              </span>{" "}
              will lose access immediately. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all duration-300"
              style={{ boxShadow: "0 6px 16px -4px rgba(220, 38, 38, 0.3)" }}
              onClick={handleDelete}
            >
              {deletePending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</>
              ) : (
                "Remove User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
