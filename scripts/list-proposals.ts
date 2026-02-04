/**
 * List Proposals
 * Quick script to list proposals for testing
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    try {
        const proposals = await prisma.proposal.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                clientName: true,
                status: true,
                isLocked: true,
                createdAt: true,
            },
        });

        if (proposals.length === 0) {
            console.log("No proposals found in database.");
            console.log("\nTo create a test proposal:");
            console.log("1. Start dev server: npm run dev");
            console.log("2. Navigate to http://localhost:3000/projects/new");
            console.log("3. Create a proposal via UI");
            process.exit(0);
        }

        console.log("Available Proposals:");
        console.log("=".repeat(60));
        proposals.forEach((p, i) => {
            console.log(`${i + 1}. ID: ${p.id}`);
            console.log(`   Client: ${p.clientName}`);
            console.log(`   Status: ${p.status}`);
            console.log(`   Locked: ${p.isLocked}`);
            console.log(`   Created: ${p.createdAt.toISOString().split("T")[0]}`);
            console.log("");
        });
        console.log("=".repeat(60));
        console.log("\nTo test webhook, use:");
        console.log(`  npx tsx scripts/simulate-docusign-webhook.ts ${proposals[0].id}`);
    } catch (error: any) {
        console.error("Error:", error.message);
        if (error.message.includes("DATABASE_URL")) {
            console.error("\n⚠️  DATABASE_URL not set. Check .env.local");
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
