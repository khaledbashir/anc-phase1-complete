import { auth } from "@/auth";
import VenueVisualizerAdmin from "./VenueVisualizerAdmin";
import Unauthorized from "@/app/components/reusables/Unauthorized";
import type { UserRole } from "@/lib/rbac";

export default async function AdminVenuesPage() {
	const session = await auth();
	const userRole = (session?.user as any)?.role as UserRole | undefined;
	const allowedRoles: UserRole[] = ["ADMIN", "ESTIMATOR", "PRODUCT_EXPERT"];
	const hasAccess = userRole && allowedRoles.includes(userRole);

	if (!hasAccess) {
		return <Unauthorized allowedRoles={allowedRoles} featureName="Venue Visualizer" />;
	}

	return (
		<div className="min-h-screen bg-background">
			<div className="max-w-[1600px] mx-auto py-10 px-4 sm:px-6 lg:px-8">
				<div className="mb-8">
					<h1 className="text-3xl font-normal text-foreground serif-vault">
						Venue Visualizer Admin
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Upload venue photos, draw LED screen hotspots, and manage the photo-based venue visualizer.
					</p>
				</div>
				<VenueVisualizerAdmin />
			</div>
		</div>
	);
}
