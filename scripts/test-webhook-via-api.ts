/**
 * Test DocuSign Webhook via API
 * 
 * Alternative approach: Tests webhook by calling the API endpoint directly,
 * then verifies results via API instead of direct database access.
 * 
 * Usage:
 *   npx tsx scripts/test-webhook-via-api.ts [proposal-id]
 */

import dotenv from "dotenv";
import { resolve } from "path";

dotenv.config({ path: resolve(process.cwd(), ".env.local") });
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:3000";

interface MockWebhookPayload {
    event: "envelope-completed";
    data: {
        envelopeId: string;
        status: string;
        statusDateTime: string;
        recipients?: Array<{
            name: string;
            email: string;
            status: string;
            signedDateTime?: string;
            ipAddress?: string;
        }>;
        customFields?: {
            textCustomFields?: Array<{
                name: string;
                value: string;
            }>;
        };
    };
}

async function testWebhookViaAPI(proposalId: string) {
    console.log("🧪 DocuSign Webhook Test via API");
    console.log("=".repeat(60));
    console.log("Proposal ID:", proposalId);
    console.log("API URL:", API_URL);
    console.log("=".repeat(60) + "\n");

    // Step 1: Get proposal before webhook
    console.log("📥 Fetching proposal before webhook...");
    const beforeResponse = await fetch(`${API_URL}/api/projects/${proposalId}`);
    if (!beforeResponse.ok) {
        throw new Error(`Failed to fetch proposal: ${beforeResponse.status}`);
    }
    const beforeData = await beforeResponse.json();
    const proposalBefore = beforeData.project;
    
    console.log("   Status:", proposalBefore.status);
    console.log("   Locked:", proposalBefore.isLocked);
    console.log("");

    // Step 2: Send webhook
    console.log("📤 Sending mock webhook...");
    const mockPayload: MockWebhookPayload = {
        event: "envelope-completed",
        data: {
            envelopeId: `mock-envelope-${Date.now()}`,
            status: "completed",
            statusDateTime: new Date().toISOString(),
            recipients: [
                {
                    name: "Test Client",
                    email: "client@example.com",
                    status: "signed",
                    signedDateTime: new Date().toISOString(),
                    ipAddress: "192.168.1.100",
                },
                {
                    name: "ANC Representative",
                    email: "signer@anc.com",
                    status: "signed",
                    signedDateTime: new Date().toISOString(),
                    ipAddress: "10.0.0.50",
                },
            ],
            customFields: {
                textCustomFields: [
                    {
                        name: "proposalId",
                        value: proposalId,
                    },
                ],
            },
        },
    };

    const webhookResponse = await fetch(`${API_URL}/api/webhooks/docusign`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(mockPayload),
    });

    const webhookResult = await webhookResponse.json();
    console.log("   Response:", webhookResponse.status);
    console.log("   Body:", JSON.stringify(webhookResult, null, 2));
    console.log("");

    if (!webhookResponse.ok) {
        throw new Error(`Webhook failed: ${webhookResponse.status}`);
    }

    // Step 3: Wait and verify
    console.log("⏳ Waiting for processing...");
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("📥 Fetching proposal after webhook...");
    const afterResponse = await fetch(`${API_URL}/api/projects/${proposalId}`);
    if (!afterResponse.ok) {
        throw new Error(`Failed to fetch proposal: ${afterResponse.status}`);
    }
    const afterData = await afterResponse.json();
    const proposalAfter = afterData.project;

    console.log("   Status:", proposalAfter.status);
    console.log("   Locked:", proposalAfter.isLocked);
    console.log("   Locked At:", proposalAfter.lockedAt);
    console.log("   Document Hash:", proposalAfter.documentHash ? `${proposalAfter.documentHash.substring(0, 16)}...` : "null");
    console.log("");

    // Verification
    console.log("✅ Verification Results:");
    console.log("=".repeat(60));
    
    const statusChanged = proposalAfter.status === "SIGNED";
    const isLocked = proposalAfter.isLocked === true;
    const hasHash = proposalAfter.documentHash !== null;
    
    console.log("   Status changed to SIGNED:", statusChanged ? "✅ YES" : "❌ NO");
    console.log("   Is Locked:", isLocked ? "✅ YES" : "❌ NO");
    console.log("   Has Document Hash:", hasHash ? "✅ YES" : "❌ NO");
    
    const allPassed = statusChanged && isLocked && hasHash;
    
    console.log("\n" + "=".repeat(60));
    if (allPassed) {
        console.log("✅ ALL VERIFICATIONS PASSED");
        console.log("   Proposal locking: ✅");
        console.log("   Status transition: ✅");
        console.log("   Document hash: ✅");
    } else {
        console.log("⚠️  SOME VERIFICATIONS FAILED");
    }
    console.log("=".repeat(60));

    return { success: allPassed, proposalBefore, proposalAfter };
}

async function main() {
    const proposalId = process.argv[2];

    if (!proposalId) {
        console.error("❌ Error: Proposal ID required");
        console.log("\nUsage:");
        console.log("  npx tsx scripts/test-webhook-via-api.ts [proposal-id]");
        console.log("\nTo get a proposal ID:");
        console.log("  1. Navigate to http://localhost:3000/projects");
        console.log("  2. Create or open a proposal");
        console.log("  3. Copy the ID from the URL");
        process.exit(1);
    }

    try {
        await testWebhookViaAPI(proposalId);
        process.exit(0);
    } catch (error: any) {
        console.error("\n❌ Test failed:", error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

export { testWebhookViaAPI };
