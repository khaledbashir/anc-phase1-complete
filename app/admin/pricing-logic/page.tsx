import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PricingLogicTreeViewer } from "./PricingLogicTreeViewer";

export default async function AdminPricingLogicPage() {
  const session = await auth();
  if (session?.user?.authRole !== "admin") {
    redirect("/");
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return (
    <div className="container max-w-6xl py-10 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Pricing Logic
        </h1>
        <p className="mt-2 text-muted-foreground">
          Decision trees that power Intelligence Mode. Select a category to view its structure.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Decision tree</CardTitle>
          <CardDescription>
            Questions, options, and formulas used by estimators and AI to generate line items.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingLogicTreeViewer categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
