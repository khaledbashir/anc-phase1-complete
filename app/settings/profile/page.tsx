import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProfileClient from "./ProfileClient";
import type { UserRole } from "@/lib/rbac";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/login");
  }

  const user = session.user as any;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-foreground serif-vault">
            Profile Settings
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Profile Form */}
        <ProfileClient
          initialName={user.name}
          initialImage={user.image}
          email={user.email}
          role={user.role as UserRole}
          emailVerified={user.emailVerified}
        />
      </div>
    </div>
  );
}
