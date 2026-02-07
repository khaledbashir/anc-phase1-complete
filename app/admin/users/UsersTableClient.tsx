"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2 } from "lucide-react";

type RoleOption = "admin" | "estimator" | "proposal_team";

type UserRow = {
  id: string;
  email: string;
  authRole: string | null;
};

const ROLE_LABELS: Record<RoleOption, string> = {
  admin: "Admin",
  estimator: "Estimator",
  proposal_team: "Proposal team",
};

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

  const getRoleOption = (r: string | null): RoleOption | null =>
    r === "admin" || r === "estimator" || r === "proposal_team" ? r : null;

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateOpen(true)}>Create User</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.email}</TableCell>
              <TableCell>
                {(() => {
                  const ro = getRoleOption(u.authRole ?? null);
                  return ro ? ROLE_LABELS[ro] : (u.authRole ?? "—");
                })()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      setEditUserId(u.id);
                      setEditRole(getRoleOption(u.authRole ?? null) ?? "estimator");
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => setDeleteUserId(u.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Password (min 8 characters)</label>
                <input
                  type="password"
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as RoleOption)}
                >
                  <option value="admin">Admin</option>
                  <option value="estimator">Estimator</option>
                  <option value="proposal_team">Proposal team</option>
                </select>
              </div>
              {createError && (
                <p className="text-sm text-destructive">{createError}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPending}>
                {createPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUserId} onOpenChange={(open) => !open && setEditUserId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Role</label>
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as RoleOption)}
              >
                <option value="admin">Admin</option>
                <option value="estimator">Estimator</option>
                <option value="proposal_team">Proposal team</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={editPending}>
              {editPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={(open) => !open && setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be removed. They will no longer be able to sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
