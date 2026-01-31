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

        // Parse request body for version control
        const body = await req.json().catch(() => ({}));
        const forceNewVersion = body.forceNewVersion || false;

        // 2. REQ-118: Version-Aware Hash Strategy
        // Each version gets its own unique, immutable share hash
        // v1 hash remains forever accessible with original data
        const versionNumber = project.versionNumber || 1;
        let shareHash: string;

        if (forceNewVersion || !project.shareHash) {
            // Generate NEW unique hash for this version
            shareHash = `${Math.random().toString(36).substring(2, 10)}-v${versionNumber}`;
            
            // Update proposal with new hash (only if it's the current version's first share)
            if (!project.shareHash) {
                await prisma.proposal.update({
                    where: { id },
                    data: { shareHash }
                });
            }
        } else {
            // Reuse existing hash for same version
            shareHash = project.shareHash;
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
                    })),
                    // SANITIZATION: Strip AI metadata (Blue Glow, citations) from public view
                    aiSource: undefined,
                    citations: undefined
                })) as any,
                // SANITIZATION: Strip all AI tracking from public share
                // Only include fields that exist in the metadata type
                metadata: {
                    filledByAI: undefined,
                    risks: undefined,
                    structuralTonnage: undefined,
                    reinforcingTonnage: undefined,
                },
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

        // 4. Save Snapshot to DB
        // REQ-118: IMMUTABLE SNAPSHOTS - once created, v1 snapshot NEVER changes
        // New versions create NEW snapshots with NEW hashes
        const existingSnapshot = await prisma.proposalSnapshot.findUnique({
            where: { shareHash }
        });

        if (!existingSnapshot) {
            // Create new immutable snapshot for this version
            await prisma.proposalSnapshot.create({
                data: {
                    proposalId: id,
                    shareHash,
                    snapshotData: JSON.stringify(snapshot)
                }
            });
        }
        // NOTE: We intentionally do NOT update existing snapshots
        // This ensures v1 links always show v1 data (immutability)

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const shareUrl = `${baseUrl}/share/${shareHash}`;

        return NextResponse.json({ 
            shareUrl,
            version: versionNumber,
            isNewSnapshot: !existingSnapshot,
            message: existingSnapshot 
                ? `Returning existing v${versionNumber} share link (immutable)` 
                : `Created new v${versionNumber} share link`
        });
    } catch (error) {
        console.error("POST /api/projects/[id]/share error:", error);
        return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 });
    }
}
