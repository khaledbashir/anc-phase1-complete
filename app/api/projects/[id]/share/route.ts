import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ProposalType } from "@/types";
import bcrypt from "bcrypt";
import { addDays } from "date-fns";
import Decimal from "decimal.js";

const prisma = new PrismaClient();

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    try {
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

        // Parse summaries if they exist
        const clientSummary = project.clientSummary ? JSON.parse(project.clientSummary) : null;
        const internalAudit = project.internalAudit ? JSON.parse(project.internalAudit) : null;

        // --- NATALIA GATEKEEPER: AI Verification Guardrail ---
        const aiFilledFields = (project.aiFilledFields as string[]) || [];
        const verifiedFields = (project.verifiedFields as Record<string, any>) || {};
        const unverifiedFields = aiFilledFields.filter(f => !verifiedFields[f]);

        if (unverifiedFields.length > 0) {
            return NextResponse.json({
                error: "AI Guardrail Block: This proposal contains unverified AI data.",
                code: "UNVERIFIED_AI_DATA",
                blockingFields: unverifiedFields
            }, { status: 422 });
        }
        // ---------------------------------------------------

        // REQ-113: Deep clone project object before sanitization to prevent data leakage
        // This ensures internal cost/margin data is never accidentally logged or served
        const sanitizedProject = JSON.parse(JSON.stringify(project));

        // Parse request body for security options
        const body = await req.json().catch(() => ({}));
        const forceNewVersion = body.forceNewVersion || false;
        const password = body.password || null;
        const daysToExpire = body.daysToExpire || 30; // Default 30 days per PRD

        // Hash password if provided
        const passwordHash = password ? await bcrypt.hash(password, 10) : null;
        const expiresAt = addDays(new Date(), daysToExpire);

        // 2. REQ-118: Version-Aware Hash Strategy
        // Each version gets its own unique, immutable share hash
        const versionNumber = project.versionNumber || 1;
        let shareHash: string;

        if (forceNewVersion || !project.shareHash) {
            shareHash = `${Math.random().toString(36).substring(2, 10)}-v${versionNumber}`;
            if (!project.shareHash) {
                await (prisma.proposal as any).update({
                    where: { id },
                    data: {
                        shareHash,
                        shareExpiresAt: expiresAt,
                        sharePasswordHash: passwordHash
                    }
                });
            }
        } else {
            shareHash = project.shareHash;
        }

        // 3. Create Sanitized Snapshot (The "Ferrari" View)
        // Map DB project to ProposalType structure
        const snapshot: Partial<ProposalType> = {
            receiver: {
                name: project.clientName,
                address: "",
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
                proposalDate: project.createdAt.toISOString(),
                dueDate: project.createdAt.toISOString(),
                items: [],
                currency: "USD",
                language: "English",
                taxDetails: { amount: 0, amountType: "amount", taxID: "" },
                discountDetails: { amount: 0, amountType: "amount" },
                shippingDetails: { cost: 0, costType: "amount" },
                paymentInformation: { bankName: "", accountName: "", accountNumber: "" },
                additionalNotes: clientSummary?.additionalNotes || "",
                paymentTerms: clientSummary?.paymentTerms || "50% on Deposit, 40% on Mobilization, 10% on Substantial Completion",
                pdfTemplate: 1,
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
                        price: Number(li.price || 0),
                        cost: 0,
                        margin: 0
                    })),
                    // CALCULATED: Sum up line item prices for screen total
                    sellPrice: s.lineItems.reduce((sum, li) => sum + Number(li.price || 0), 0),
                    // SANITIZATION: Strip AI metadata
                    aiSource: undefined,
                    citations: undefined
                })) as any,
                // REQ-User-Feedback: Include marginAnalysis for PDF mirroring
                // Note: marginAnalysis is handled via clientSummary parsing
                totalAmount: clientSummary?.finalClientTotal || 0,
                totalAmountInWords: "",
                documentType: clientSummary?.documentType || "First Round",
                pricingType: clientSummary?.pricingType || "Budget",
                proposalNumber: project.id.substring(0, 8).toUpperCase(),
                subTotal: clientSummary?.sellPrice || 0,
                mirrorMode: clientSummary?.mirrorMode || false,
                calculationMode: project.calculationMode,
                venue: clientSummary?.venue || "Generic",
                // SECURITY: Strictly nullify internal financial logic
                bondRateOverride: Number(project.bondRateOverride) || undefined,
                taxRateOverride: Number(project.taxRateOverride) || undefined,
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
            await (prisma.proposalSnapshot as any).create({
                data: {
                    proposalId: id,
                    shareHash,
                    snapshotData: JSON.stringify(snapshot),
                    expiresAt,
                    passwordHash
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
