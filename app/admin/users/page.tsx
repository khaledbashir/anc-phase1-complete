import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UsersTableClient } from "./UsersTableClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.authRole !== "admin") {
    redirect("/");
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, authRole: true },
    orderBy: { email: "asc" },
  });
  return (
    <div className="container max-w-5xl py-10 px-4">
      <UsersTableClient users={users} />
    </div>
  );
}
