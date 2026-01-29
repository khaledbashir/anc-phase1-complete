import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ProposalType } from "@/types";

const prisma = new PrismaClient();

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
        // 1. Fetch Full Proposal Data
        const project = await prisma.proposal.findUnique({
            where: { id },
            include: {
                screens: {
                    include: { lineItems: true }
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: "Project not found" }, { status: 404 });
        }

        // REQ-113: Deep clone project object before sanitization to prevent data leakage
        // This ensures internal cost/margin data is never accidentally logged or served
        const sanitizedProject = JSON.parse(JSON.stringify(project));

        // 2. Manage Hash Strategy
        let shareHash = project.shareHash;
        if (!shareHash) {
            shareHash = Math.random().toString(36).substring(2, 14);
            // Link hash to parent proposal for reference
            await prisma.proposal.update({
                where: { id },
                data: { shareHash }
            });
        }

        // 3. Create Sanitized Snapshot (The "Ferrari" View)
        // Map DB project to ProposalType structure
        const snapshot: Partial<ProposalType> = {
            receiver: {
                name: project.clientName,
                address: "", // Can be filled if we had address in DB
                zipCode: "",
                city: "",
                country: "",
                email: "",
                phone: "",
                customInputs: []
            },
            sender: {
                name: "ANC Sports Enterprises",
                address: "2 Manhattanville Road, Suite 402",
                zipCode: "10577",
                city: "Purchase, NY",
                country: "United States",
                email: "info@ancsports.com",
                phone: "(914) 696-2100",
                customInputs: []
            },
            details: {
                proposalId: project.id,
                proposalName: project.clientName,
                proposalDate: new Date().toISOString(),
                dueDate: new Date().toISOString(),
                items: [],
                currency: "USD",
                language: "English",
                taxDetails: { amount: 0, amountType: "amount", taxID: "" },
                discountDetails: { amount: 0, amountType: "amount" },
                shippingDetails: { cost: 0, costType: "amount" },
                paymentInformation: { bankName: "", accountName: "", accountNumber: "" },
                additionalNotes: "",
                paymentTerms: "Net 30",
                pdfTemplate: 2,
                screens: project.screens.map(s => ({
                    id: s.id,
                    name: s.name,
                    pitchMm: s.pixelPitch,
                    widthFt: s.width,
                    heightFt: s.height,
                    quantity: 1,
                    // SANITIZATION: Strictly zero out all internal cost/margin data
                    lineItems: s.lineItems.map(li => ({
                        category: li.category,
                        price: li.price,
                        cost: 0,
                        margin: 0
                    }))
                })) as any,
                totalAmount: 0, // Will be calculated by template
                totalAmountInWords: "",
                documentType: "First Round",
                pricingType: "Budget",
                proposalNumber: "",
                subTotal: 0,
                mirrorMode: false,
                calculationMode: "INTELLIGENCE",
                venue: "Generic", // REQ-47 default
                // SECURITY: Strictly nullify internal financial logic
                bondRateOverride: undefined,
                taxRateOverride: undefined,
                internalAudit: undefined
            }
        };

        // 4. Save Snapshot to DB (Upsert)
        await prisma.proposalSnapshot.upsert({
            where: { shareHash },
            create: {
                proposalId: id,
                shareHash,
                snapshotData: JSON.stringify(snapshot)
            },
            update: {
                snapshotData: JSON.stringify(snapshot),
                createdAt: new Date() // Refresh timestamp
            }
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const shareUrl = `${baseUrl}/share/${shareHash}`;

        return NextResponse.json({ shareUrl });
    } catch (error) {
        console.error("POST /api/projects/[id]/share error:", error);
        return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
    }
}
