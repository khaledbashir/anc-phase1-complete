/**
 * Create Test Proposal
 * 
 * Creates a test proposal in the database for webhook testing.
 * Uses Prisma to insert directly.
 * 
 * Usage:
 *   npx tsx scripts/create-test-proposal.ts
 */

// Load environment variables
import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createTestProposal() {
    try {
        // Find or create a workspace first
        let workspace = await prisma.workspace.findFirst();
        
        if (!workspace) {
            workspace = await prisma.workspace.create({
                data: {
                    name: "Test Workspace",
                },
            });
            console.log("✅ Created test workspace:", workspace.id);
        } else {
            console.log("✅ Using existing workspace:", workspace.id);
        }

        // Create a test proposal
        const proposal = await prisma.proposal.create({
            data: {
                workspaceId: workspace.id,
                clientName: "Test Client for Webhook",
                status: "APPROVED", // Start as APPROVED so we can test signing
                isLocked: false,
                documentMode: "PROPOSAL",
            },
        });

        console.log("\n✅ Test Proposal Created:");
        console.log("   ID:", proposal.id);
        console.log("   Client:", proposal.clientName);
        console.log("   Status:", proposal.status);
        console.log("   Locked:", proposal.isLocked);
        console.log("\n📋 Use this ID for webhook test:");
        console.log(`   npx tsx scripts/simulate-docusign-webhook.ts ${proposal.id}`);

        return proposal.id;
    } catch (error: any) {
        console.error("❌ Error creating test proposal:", error.message);
        if (error.code === "P1001") {
            console.error("\n⚠️  Database connection failed.");
            console.error("   Please configure DATABASE_URL in .env.local");
        }
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    createTestProposal()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export { createTestProposal };
