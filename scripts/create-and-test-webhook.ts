/**
 * Create Test Proposal and Run Webhook Test
 * 
 * Creates a test proposal via API, then immediately tests the webhook.
 * This is a complete end-to-end test.
 * 
 * Usage:
 *   npx tsx scripts/create-and-test-webhook.ts
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

async function createWorkspace(): Promise<string> {
    console.log("📦 Creating test workspace...");
    const response = await fetch(`${API_URL}/api/workspaces/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test Workspace for Webhook",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create workspace: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.workspace?.id || data.id;
}

async function createProposal(workspaceId: string): Promise<string> {
    console.log("📝 Creating test proposal...");
    const response = await fetch(`${API_URL}/api/proposals/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            workspaceId,
            clientName: "Test Client for Webhook Verification",
            screens: [
                {
                    name: "Test Display",
                    pitchMm: 10,
                    widthFt: 40,
                    heightFt: 20,
                    quantity: 1,
                },
            ],
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create proposal: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.proposal?.id || data.id;
}

async function testWebhook(proposalId: string) {
    console.log("\n🚀 Testing webhook...");
    
    // Get proposal before
    const beforeResponse = await fetch(`${API_URL}/api/projects/${proposalId}`);
    if (!beforeResponse.ok) {
        throw new Error(`Failed to fetch proposal: ${beforeResponse.status}`);
    }
    const beforeData = await beforeResponse.json();
    const proposalBefore = beforeData.project;
    
    console.log("   Before - Status:", proposalBefore.status);
    console.log("   Before - Locked:", proposalBefore.isLocked);

    // Send webhook
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
                    { name: "proposalId", value: proposalId },
                ],
            },
        },
    };

    const webhookResponse = await fetch(`${API_URL}/api/webhooks/docusign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockPayload),
    });

    const webhookResult = await webhookResponse.json();
    console.log("   Webhook Response:", webhookResponse.status);
    
    if (!webhookResponse.ok) {
        throw new Error(`Webhook failed: ${webhookResponse.status} ${JSON.stringify(webhookResult)}`);
    }

    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 2000));

    const afterResponse = await fetch(`${API_URL}/api/projects/${proposalId}`);
    if (!afterResponse.ok) {
        throw new Error(`Failed to fetch proposal after: ${afterResponse.status}`);
    }
    const afterData = await afterResponse.json();
    const proposalAfter = afterData.project;

    console.log("\n   After - Status:", proposalAfter.status);
    console.log("   After - Locked:", proposalAfter.isLocked);
    console.log("   After - Locked At:", proposalAfter.lockedAt);
    console.log("   After - Document Hash:", proposalAfter.documentHash ? `${proposalAfter.documentHash.substring(0, 16)}...` : "null");

    // Verification
    console.log("\n✅ Verification Results:");
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
        if (!statusChanged) console.log("   ❌ Status not SIGNED");
        if (!isLocked) console.log("   ❌ Not locked");
        if (!hasHash) console.log("   ❌ No document hash");
    }
    console.log("=".repeat(60));

    return { success: allPassed, proposalBefore, proposalAfter };
}

async function main() {
    console.log("🧪 Complete Webhook Test - Create & Verify");
    console.log("=".repeat(60));
    console.log("This will:");
    console.log("  1. Create a test workspace");
    console.log("  2. Create a test proposal");
    console.log("  3. Send mock webhook");
    console.log("  4. Verify locking and audit trail");
    console.log("=".repeat(60) + "\n");

    try {
        // Create workspace
        const workspaceId = await createWorkspace();
        console.log("✅ Workspace created:", workspaceId);

        // Create proposal
        const proposalId = await createProposal(workspaceId);
        console.log("✅ Proposal created:", proposalId);

        // Update proposal status to APPROVED (required for signing)
        console.log("\n📋 Updating proposal status to APPROVED...");
        const updateResponse = await fetch(`${API_URL}/api/projects/${proposalId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                status: "APPROVED",
            }),
        });
        
        if (!updateResponse.ok) {
            console.warn("⚠️  Failed to update status (may not be required)");
        } else {
            console.log("✅ Status updated to APPROVED");
        }

        // Test webhook
        const result = await testWebhook(proposalId);

        if (result.success) {
            console.log("\n🎉 SUCCESS: Phase 2.3 DocuSign Integration VERIFIED!");
            console.log("   All webhook logic working correctly");
            process.exit(0);
        } else {
            console.log("\n⚠️  WARNING: Some verifications failed");
            process.exit(1);
        }
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

export { createWorkspace, createProposal, testWebhook };
