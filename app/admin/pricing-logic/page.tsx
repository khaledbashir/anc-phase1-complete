import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PricingLogicTreeEditor } from "./PricingLogicTreeEditor";

export default async function AdminPricingLogicPage() {
	const session = await auth();
	if (session?.user?.authRole !== "admin") {
		redirect("/");
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
