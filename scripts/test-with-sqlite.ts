/**
 * Test with SQLite
 * 
 * Temporarily switches to SQLite for testing when PostgreSQL is unavailable.
 * Creates test database, runs migrations, creates test proposal, runs webhook test.
 * 
 * Usage:
 *   npx tsx scripts/test-with-sqlite.ts
 */

import { execSync } from "child_process";
import { existsSync, unlinkSync } from "fs";
import { resolve } from "path";

const TEST_DB_PATH = resolve(process.cwd(), "test.db");
const TEST_SCHEMA_PATH = resolve(process.cwd(), "prisma/schema.test.prisma");

async function main() {
    console.log("🧪 SQLite Test Mode - DocuSign Webhook Verification");
    console.log("=".repeat(60));
    console.log("This will:");
    console.log("  1. Create SQLite test database");
    console.log("  2. Run Prisma migrations");
    console.log("  3. Create test proposal");
    console.log("  4. Run webhook simulation");
    console.log("=".repeat(60) + "\n");

    try {
        // Step 1: Set DATABASE_URL to SQLite
        process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
        console.log("✅ Set DATABASE_URL to SQLite:", process.env.DATABASE_URL);

        // Step 2: Generate Prisma client with SQLite
        console.log("\n📦 Generating Prisma client...");
        execSync(`npx prisma generate --schema=${TEST_SCHEMA_PATH}`, {
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
        });

        // Step 3: Push schema to SQLite
        console.log("\n🗄️  Creating database schema...");
        execSync(`npx prisma db push --schema=${TEST_SCHEMA_PATH} --skip-generate`, {
            stdio: "inherit",
            env: { ...process.env, DATABASE_URL: `file:${TEST_DB_PATH}` },
        });

        // Step 4: Create test proposal
        console.log("\n📝 Creating test proposal...");
        const { PrismaClient } = await import("@prisma/client");
        const prisma = new PrismaClient({
            datasources: {
                db: {
                    url: `file:${TEST_DB_PATH}`,
                },
            },
        });

        // Create workspace
        let workspace = await prisma.workspace.findFirst();
        if (!workspace) {
            workspace = await prisma.workspace.create({
                data: { name: "Test Workspace" },
            });
        }

        // Create proposal
        const proposal = await prisma.proposal.create({
            data: {
                workspaceId: workspace.id,
                clientName: "Test Client for Webhook",
                status: "APPROVED",
                isLocked: false,
                documentMode: "PROPOSAL",
            },
        });

        console.log("✅ Test proposal created:", proposal.id);
        await prisma.$disconnect();

        // Step 5: Run webhook test
        console.log("\n🚀 Running webhook simulation...");
        const proposalId = proposal.id;
        
        // Import and run webhook test
        const { simulateWebhook, verifyProposalState } = await import("./simulate-docusign-webhook");
        
        // Set DATABASE_URL for webhook script
        process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
        
        await simulateWebhook(proposalId);
        
        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify
        const verification = await verifyProposalState(proposalId);
        
        if (verification.verification.allChecksPassed) {
            console.log("\n🎉 SUCCESS: All webhook logic verified!");
            console.log("\n📊 Final State:");
            console.log("   Status:", verification.proposal.status);
            console.log("   Locked:", verification.proposal.isLocked);
            console.log("   Audit Records:", verification.auditRecords.length);
        } else {
            console.log("\n⚠️  Some verifications failed");
            process.exit(1);
        }

        // Cleanup option
        console.log("\n💾 Test database saved at:", TEST_DB_PATH);
        console.log("   To clean up: rm test.db");
        
    } catch (error: any) {
        console.error("\n❌ Test failed:", error.message);
        if (error.stack) {
            console.error("\nStack:", error.stack);
        }
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
