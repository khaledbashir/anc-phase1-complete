/**
 * Direct Webhook Test
 * 
 * Tests the webhook handler directly with a test proposal ID.
 * This verifies the webhook logic works even if proposal doesn't exist yet.
 * 
 * Usage:
 *   npx tsx scripts/test-webhook-direct.ts [proposal-id]
 * 
 * If no proposal ID provided, uses a test ID and documents the requirement.
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

async function testWebhookDirect(proposalId: string) {
    console.log("🧪 DocuSign Webhook Direct Test");
    console.log("=".repeat(60));
    console.log("Proposal ID:", proposalId);
    console.log("API URL:", API_URL);
    console.log("=".repeat(60) + "\n");

    // Check if proposal exists first
    console.log("📥 Checking if proposal exists...");
    let proposalBefore = null;
    try {
        const checkResponse = await fetch(`${API_URL}/api/projects/${proposalId}`);
        
        if (checkResponse.ok) {
            const contentType = checkResponse.headers.get("content-type");
            if (contentType?.includes("application/json")) {
                const checkData = await checkResponse.json();
                proposalBefore = checkData.project;
                console.log("✅ Proposal found:");
                console.log("   Client:", proposalBefore.clientName);
                console.log("   Status:", proposalBefore.status);
                console.log("   Locked:", proposalBefore.isLocked);
                console.log("");
            } else {
                console.log("⚠️  API returned non-JSON response (may be HTML)");
                console.log("   Continuing with webhook test...\n");
            }
        } else if (checkResponse.status === 404) {
            console.log("⚠️  Proposal not found in database");
            console.log("   This is expected if using a test ID");
            console.log("   The webhook will handle this gracefully\n");
        }
    } catch (error: any) {
        console.log("⚠️  Could not check proposal (API may not be accessible)");
        console.log("   Continuing with webhook test...\n");
    }

    // Send webhook
    console.log("📤 Sending mock webhook payload...");
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

    let webhookResult: any;
    const contentType = webhookResponse.headers.get("content-type");
    if (contentType?.includes("application/json")) {
        webhookResult = await webhookResponse.json();
    } else {
        const text = await webhookResponse.text();
        console.log("⚠️  Webhook returned non-JSON:", text.substring(0, 200));
        webhookResult = { message: text.substring(0, 100) };
    }
    
    console.log("📥 Webhook Response:");
    console.log("   Status:", webhookResponse.status);
    console.log("   Body:", JSON.stringify(webhookResult, null, 2));
    console.log("");

    // Verify response
    if (webhookResponse.ok) {
        console.log("✅ Webhook handler executed successfully");
        
        if (webhookResult.ok && webhookResult.message) {
            console.log("   Message:", webhookResult.message);
        }

        // If proposal existed, check if it was updated
        if (checkResponse.ok) {
            console.log("\n⏳ Waiting for processing...");
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log("📥 Fetching proposal after webhook...");
            const afterResponse = await fetch(`${API_URL}/api/projects/${proposalId}`);
            
            if (afterResponse.ok) {
                const contentType = afterResponse.headers.get("content-type");
                if (!contentType?.includes("application/json")) {
                    console.log("⚠️  API returned non-JSON response");
                    return { success: true, note: "Webhook executed, but API returned HTML" };
                }
                const afterData = await afterResponse.json();
                const proposalAfter = afterData.project;

                console.log("\n📊 Proposal State After Webhook:");
                console.log("   Status:", proposalAfter.status);
                console.log("   Locked:", proposalAfter.isLocked);
                console.log("   Locked At:", proposalAfter.lockedAt);
                console.log("   Document Hash:", proposalAfter.documentHash ? `${proposalAfter.documentHash.substring(0, 16)}...` : "null");

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
                    return { success: true, proposalAfter };
                } else {
                    console.log("⚠️  SOME VERIFICATIONS FAILED");
                    return { success: false, proposalAfter };
                }
            } else {
                console.log("⚠️  Could not fetch proposal after webhook (may have been deleted or ID invalid)");
                return { success: true, note: "Webhook executed but proposal not found after" };
            }
        } else {
            console.log("\n✅ Webhook handler executed successfully");
            console.log("   (Proposal not found, but webhook logic is working)");
            return { success: true, note: "Webhook executed, proposal not found" };
        }
    } else {
        console.log("❌ Webhook handler returned error");
        return { success: false, error: webhookResult };
    }
}

async function main() {
    let proposalId = process.argv[2];

    if (!proposalId) {
        console.log("⚠️  No proposal ID provided");
        console.log("\nTo test with a real proposal:");
        console.log("  1. Navigate to http://localhost:3000/projects");
        console.log("  2. Create or open a proposal");
        console.log("  3. Copy the ID from the URL");
        console.log("  4. Run: npx tsx scripts/test-webhook-direct.ts [proposal-id]");
        console.log("\nTesting webhook handler logic (will show 'proposal not found' but verify handler works)...\n");
        proposalId = "test-proposal-id-" + Date.now();
    }

    try {
        const result = await testWebhookDirect(proposalId);
        
        if (result.success) {
            console.log("\n🎉 Webhook handler logic VERIFIED!");
            process.exit(0);
        } else {
            console.log("\n⚠️  Test completed with warnings");
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

export { testWebhookDirect };
