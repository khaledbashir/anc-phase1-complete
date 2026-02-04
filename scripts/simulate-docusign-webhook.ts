/**
 * Simulate DocuSign Webhook
 * 
 * Tests the webhook handler logic without requiring live DocuSign credentials.
 * Verifies:
 * - Proposal status changes to SIGNED
 * - Proposal isLocked is set to true
 * - SignatureAuditTrail records are created
 * 
 * Usage:
 *   npx tsx scripts/simulate-docusign-webhook.ts [proposal-id]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

/**
 * Simulate DocuSign envelope-completed webhook
 */
async function simulateWebhook(proposalId: string) {
    const apiUrl = process.env.API_URL || "http://localhost:3000";
    const webhookUrl = `${apiUrl}/api/webhooks/docusign`;

    // Create mock webhook payload
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

    console.log("📤 Sending mock webhook payload...");
    console.log("   Proposal ID:", proposalId);
    console.log("   Webhook URL:", webhookUrl);
    console.log("   Recipients:", mockPayload.data.recipients?.length || 0);

    try {
        // Send POST request to webhook endpoint
        const response = await fetch(webhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(mockPayload),
        });

        const responseData = await response.json();
        
        console.log("\n📥 Webhook Response:");
        console.log("   Status:", response.status);
        console.log("   Body:", JSON.stringify(responseData, null, 2));

        if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status} ${JSON.stringify(responseData)}`);
        }

        return { success: true, response: responseData };
    } catch (error: any) {
        console.error("\n❌ Webhook request failed:", error.message);
        throw error;
    }
}

/**
 * Verify proposal state after webhook
 */
async function verifyProposalState(proposalId: string) {
    console.log("\n🔍 Verifying proposal state...");

    const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
            signatureAuditTrail: true,
        },
    });

    if (!proposal) {
        throw new Error(`Proposal ${proposalId} not found`);
    }

    console.log("\n📊 Proposal State:");
    console.log("   ID:", proposal.id);
    console.log("   Status:", proposal.status);
    console.log("   Is Locked:", proposal.isLocked);
    console.log("   Locked At:", proposal.lockedAt);
    console.log("   Document Hash:", proposal.documentHash ? `${proposal.documentHash.substring(0, 16)}...` : "null");

    // Verify locking
    const isLocked = proposal.isLocked === true;
    const statusIsSigned = proposal.status === "SIGNED";
    const hasDocumentHash = proposal.documentHash !== null;

    console.log("\n✅ Locking Verification:");
    console.log("   Status is SIGNED:", statusIsSigned ? "✅ YES" : "❌ NO");
    console.log("   Is Locked:", isLocked ? "✅ YES" : "❌ NO");
    console.log("   Has Document Hash:", hasDocumentHash ? "✅ YES" : "❌ NO");

    // Verify audit trail
    const auditRecords = proposal.signatureAuditTrail || [];
    console.log("\n📝 Audit Trail Records:", auditRecords.length);

    auditRecords.forEach((record, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log("     Signer Name:", record.signerName);
        console.log("     Signer Email:", record.signerEmail);
        console.log("     Signer Role:", record.signerRole);
        console.log("     Signed At:", record.signedAt);
        console.log("     IP Address:", record.ipAddress);
        console.log("     Document Hash:", record.documentHash ? `${record.documentHash.substring(0, 16)}...` : "null");
    });

    const hasAuditRecords = auditRecords.length > 0;
    const hasClientRecord = auditRecords.some(r => r.signerEmail === "client@example.com");
    const hasAncRecord = auditRecords.some(r => r.signerEmail === "signer@anc.com");

    console.log("\n✅ Audit Trail Verification:");
    console.log("   Records Created:", hasAuditRecords ? "✅ YES" : "❌ NO");
    console.log("   Client Record:", hasClientRecord ? "✅ YES" : "❌ NO");
    console.log("   ANC Record:", hasAncRecord ? "✅ YES" : "❌ NO");

    // Overall verification
    const allChecksPassed = isLocked && statusIsSigned && hasDocumentHash && hasAuditRecords;

    console.log("\n" + "=".repeat(60));
    if (allChecksPassed) {
        console.log("✅ ALL VERIFICATIONS PASSED");
        console.log("   Proposal locking: ✅");
        console.log("   Audit trail creation: ✅");
        console.log("   Document hash generation: ✅");
    } else {
        console.log("⚠️  SOME VERIFICATIONS FAILED");
        if (!isLocked) console.log("   ❌ Proposal not locked");
        if (!statusIsSigned) console.log("   ❌ Status not SIGNED");
        if (!hasDocumentHash) console.log("   ❌ Document hash missing");
        if (!hasAuditRecords) console.log("   ❌ No audit records created");
    }
    console.log("=".repeat(60));

    return {
        proposal,
        auditRecords,
        verification: {
            isLocked,
            statusIsSigned,
            hasDocumentHash,
            hasAuditRecords,
            hasClientRecord,
            hasAncRecord,
            allChecksPassed,
        },
    };
}

/**
 * Main execution
 */
async function main() {
    const proposalId = process.argv[2];

    if (!proposalId) {
        console.error("❌ Error: Proposal ID required");
        console.log("\nUsage:");
        console.log("  npx tsx scripts/simulate-docusign-webhook.ts [proposal-id]");
        console.log("\nExample:");
        console.log("  npx tsx scripts/simulate-docusign-webhook.ts clx123abc456");
        process.exit(1);
    }

    try {
        console.log("🚀 DocuSign Webhook Simulation Test");
        console.log("=".repeat(60));
        console.log("Proposal ID:", proposalId);
        console.log("=".repeat(60) + "\n");

        // Check if proposal exists
        const existingProposal = await prisma.proposal.findUnique({
            where: { id: proposalId },
        });

        if (!existingProposal) {
            throw new Error(`Proposal ${proposalId} not found in database`);
        }

        console.log("✅ Proposal found:", existingProposal.clientName);
        console.log("   Current Status:", existingProposal.status);
        console.log("   Current Locked:", existingProposal.isLocked);
        console.log("");

        // Send webhook
        await simulateWebhook(proposalId);

        // Wait a moment for async processing
        console.log("\n⏳ Waiting for webhook processing...");
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Verify state
        const verification = await verifyProposalState(proposalId);

        if (verification.verification.allChecksPassed) {
            console.log("\n🎉 SUCCESS: All webhook logic verified!");
            process.exit(0);
        } else {
            console.log("\n⚠️  WARNING: Some verifications failed. Check logs above.");
            process.exit(1);
        }
    } catch (error: any) {
        console.error("\n❌ Test failed:", error.message);
        if (error.stack) {
            console.error("\nStack trace:", error.stack);
        }
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

export { simulateWebhook, verifyProposalState };
