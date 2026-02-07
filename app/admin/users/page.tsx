import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { UsersTableClient } from "./UsersTableClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (session?.user?.authRole !== "admin") {
    redirect("/");
  }
  const users = await prisma.user.findMany({
    select: { id: true, email: true, authRole: true },
    orderBy: { email: "asc" },
  });
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      <Card className="p-6">
        <UsersTableClient users={users} />
      </Card>
    </div>
  );
}
