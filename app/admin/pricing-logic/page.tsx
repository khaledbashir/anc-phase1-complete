import { auth } from "@/auth";
import { PricingLogicTreeEditor } from "./PricingLogicTreeEditor";
import Unauthorized from "@/app/components/reusables/Unauthorized";
import type { UserRole } from "@/lib/rbac";

export default async function AdminPricingLogicPage() {
	const session = await auth();
	const userRole = (session?.user as any)?.role as UserRole | undefined;

	// Check RBAC permission
	const allowedRoles: UserRole[] = ["ADMIN"];
	const hasAccess = userRole && allowedRoles.includes(userRole);

	if (!hasAccess) {
		return <Unauthorized allowedRoles={allowedRoles} featureName="Pricing Logic" />;
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
				{/* Header */}
				<div className="mb-8">
					<h1 className="text-3xl font-normal text-foreground serif-vault">
						Pricing Logic
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Build decision trees that power Intelligence Mode pricing. Jeremy uses these to define how quotes are calculated.
					</p>
				</div>

				{/* Editor */}
				<PricingLogicTreeEditor />
			</div>
		</div>
	);
}
