import { redirect } from "next/navigation";
import { PrismaClient } from "@prisma/client";
import ProposalPage from "@/app/components/ProposalPage";

const prisma = new PrismaClient();

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectEditorPage({ params }: PageProps) {
    const { id } = await params;

    const project = await prisma.proposal.findUnique({
        where: { id },
        include: {
            screens: {
                include: { lineItems: true } // Include nested items if applicable, though schema says lineItems are on screens
            }
        }
    });

    if (!project) {
        redirect("/projects");
    }

    // Pass data to client component
    // We need to serialize the data properly (decimals to numbers/strings)
    const serializedProject = JSON.parse(JSON.stringify(project));

    return <ProposalPage initialData={serializedProject} projectId={id} />;
}
