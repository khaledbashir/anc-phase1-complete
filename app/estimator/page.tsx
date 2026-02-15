import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * /estimator — Auto-creates a new ESTIMATE project and redirects.
 * Every estimate gets saved from the start.
 */
export default async function EstimatorPage() {
    const session = await auth();
    if (!session?.user) {
        redirect("/");
    }

    // Create workspace + estimate project
    const workspace = await prisma.workspace.create({
        data: {
            name: "Estimate",
            users: {
                connectOrCreate: {
                    where: { email: session.user.email || "noreply@anc.com" },
                    create: { email: session.user.email || "noreply@anc.com" },
                },
            },
        },
    });

    const project = await prisma.proposal.create({
        data: {
            workspaceId: workspace.id,
            clientName: "New Estimate",
            calculationMode: "ESTIMATE",
            status: "DRAFT",
        },
    });

    redirect(`/estimator/${project.id}`);
}
