import { redirect } from "next/navigation";
import { auth } from "@/auth";
import ProductCatalogAdmin from "./ProductCatalogAdmin";

export default async function AdminProductsPage() {
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
						Product Catalog
					</h1>
					<p className="mt-2 text-sm text-muted-foreground">
						Manage LED display products from all manufacturers. Import spreadsheets or add products manually.
					</p>
				</div>

				{/* Admin UI */}
				<ProductCatalogAdmin />
			</div>
		</div>
	);
}
