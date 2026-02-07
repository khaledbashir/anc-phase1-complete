"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import type { UserRole } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.authRole;
  if (role !== "admin") throw new Error("Forbidden: admin only");
}

const roleMap: Record<string, UserRole> = {
  admin: "ADMIN",
  estimator: "ESTIMATOR",
  proposal_team: "VIEWER",
};

export async function createUser(
  email: string,
  password: string,
  role: "admin" | "estimator" | "proposal_team"
) {
  await requireAdmin();
  const e = email.trim().toLowerCase();
  if (!e || !password || password.length < 8)
    throw new Error("Email and password (min 8 chars) required");
  if (await prisma.user.findUnique({ where: { email: e } }))
    throw new Error("User already exists");
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email: e,
      passwordHash: hash,
      authRole: role,
      role: roleMap[role] ?? "VIEWER",
      name: e.split("@")[0],
    },
  });
  revalidatePath("/admin/users");
}

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "estimator" | "proposal_team"
) {
  await requireAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { authRole: newRole, role: roleMap[newRole] ?? "VIEWER" },
  });
  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  await requireAdmin();
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}
