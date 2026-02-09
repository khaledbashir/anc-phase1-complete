/**
 * POST /api/webhooks/docusign
 * 
 * DocuSign webhook receiver for envelope status updates.
 * Listens for envelope.completed events and locks proposals.
 * 
 * REQ-126: Digital Signature Completion (Phase 2.3)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocuSignService } from "@/lib/signatures/docusign";
import crypto from "crypto";

/**
 * DocuSign webhook event types
 */
type DocuSignEvent = 
    | "envelope-sent"
    | "envelope-delivered"
    | "envelope-completed"
    | "envelope-declined"
    | "envelope-voided";

interface DocuSignWebhookPayload {
    event: DocuSignEvent;
    data: {
        envelopeId: string;
        status: string;
        statusDateTime: string;
        recipients?: Array<{
            name: string;
            email: string;
            status: string;
            signedDateTime?: string;
        }>;
    };
    customFields?: {
        proposalId?: string; // We'll pass this in the envelope custom fields
    };
}

/**
 * Verify webhook signature (optional but recommended for production)
 */
function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("hex");
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

export async function POST(req: NextRequest) {
    try {
        // Get webhook secret from environment
        const webhookSecret = process.env.DOCUSIGN_WEBHOOK_SECRET;
        
        // Read raw body for signature verification
        const rawBody = await req.text();
        const signature = req.headers.get("x-docusign-signature") || "";

        // Verify signature if secret is configured
        if (webhookSecret && signature) {
            const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
            if (!isValid) {
                return NextResponse.json(
                    { error: "Invalid webhook signature" },
                    { status: 401 }
                );
            }
        }

        // Parse webhook payload
        const payload: DocuSignWebhookPayload = JSON.parse(rawBody);

        // Handle envelope.completed event
        if (payload.event === "envelope-completed") {
            const { envelopeId } = payload.data as any;
            
            // Extract proposalId from envelope custom fields
            // DocuSign sends custom fields in a different format
            const envelopeCustomFields = (payload.data as any).customFields;
            let proposalId: string | undefined;
            
            if (envelopeCustomFields?.textCustomFields) {
                const proposalIdField = envelopeCustomFields.textCustomFields.find(
                    (f: any) => f.name === "proposalId"
                );
                proposalId = proposalIdField?.value;
            }

            if (!proposalId) {
                console.warn("DocuSign webhook: No proposalId in custom fields", envelopeId);
                return NextResponse.json({ ok: true, message: "No proposalId found" });
            }

            // Find proposal by DocuSign envelope ID or proposal ID
            const proposal = await prisma.proposal.findFirst({
                where: {
                    OR: [
                        { id: proposalId },
                        // TODO: Add envelopeId field to Proposal model if tracking DocuSign envelopes
                    ],
                },
            });

            if (!proposal) {
                console.warn("DocuSign webhook: Proposal not found", proposalId);
                return NextResponse.json({ ok: true, message: "Proposal not found" });
            }

            // Generate document hash for audit trail
            const documentHash = crypto
                .createHash("sha256")
                .update(JSON.stringify(proposal))
                .digest("hex");

            // Lock the proposal (make it immutable)
            await prisma.proposal.update({
                where: { id: proposal.id },
                data: {
                    status: "SIGNED",
                    isLocked: true,
                    lockedAt: new Date(),
                    documentHash,
                },
            });

            // Create SignatureAuditTrail records from DocuSign envelope data
            try {
                const docusignService = createDocuSignService();
                
                if (docusignService) {
                    // Fetch complete envelope details from DocuSign API
                    const envelope = await docusignService.getEnvelopeStatus(envelopeId);
                    
                    // Create audit trail records for each signer
                    const signedRecipients = envelope.recipients.filter(r => r.status === "signed");
                    
                    for (const recipient of signedRecipients) {
                        // Determine signer role based on recipient data or proposal context
                        // Default to "PURCHASER" for client signers, "ANC_REPRESENTATIVE" for internal
                        const signerRole = recipient.email?.toLowerCase().includes("@anc") 
                            ? "ANC_REPRESENTATIVE" 
                            : "PURCHASER";
                        
                        await prisma.signatureAuditTrail.create({
                            data: {
                                proposalId: proposal.id,
                                signerEmail: recipient.email,
                                signerName: recipient.name,
                                signerTitle: null, // DocuSign doesn't provide title in webhook
                                signerRole,
                                ipAddress: recipient.ipAddress || "unknown",
                                userAgent: null, // DocuSign webhook doesn't include user agent
                                authMethod: "EMAIL_LINK", // DocuSign uses email-based authentication
                                documentHash,
                                pdfHash: null, // Can be populated later if needed
                                auditExcelHash: null, // Can be populated later if needed
                                signedAt: recipient.signedDateTime 
                                    ? new Date(recipient.signedDateTime) 
                                    : new Date(envelope.statusDateTime),
                            },
                        });
                    }
                    
                    console.log(`DocuSign webhook: Created ${signedRecipients.length} audit trail record(s) for proposal ${proposalId}`);
                } else {
                    // Fallback: Create audit record from webhook payload if DocuSign service unavailable
                    const recipients = payload.data.recipients || [];
                    const signedRecipients = recipients.filter((r: any) => r.status === "signed");
                    
                    for (const recipient of signedRecipients) {
                        const signerRole = recipient.email?.toLowerCase().includes("@anc") 
                            ? "ANC_REPRESENTATIVE" 
                            : "PURCHASER";
                        
                        await prisma.signatureAuditTrail.create({
                            data: {
                                proposalId: proposal.id,
                                signerEmail: recipient.email,
                                signerName: recipient.name,
                                signerTitle: null,
                                signerRole,
                                ipAddress: "unknown", // Not available in webhook payload
                                userAgent: null,
                                authMethod: "EMAIL_LINK",
                                documentHash,
                                pdfHash: null,
                                auditExcelHash: null,
                                signedAt: recipient.signedDateTime 
                                    ? new Date(recipient.signedDateTime) 
                                    : new Date(payload.data.statusDateTime),
                            },
                        });
                    }
                    
                    console.log(`DocuSign webhook: Created ${signedRecipients.length} audit trail record(s) from webhook payload (DocuSign service unavailable)`);
                }
            } catch (auditError: any) {
                // Log error but don't fail the webhook - proposal is already locked
                console.error("DocuSign webhook: Failed to create audit trail records:", auditError);
                // Continue execution - proposal locking succeeded
            }

            console.log(`DocuSign webhook: Proposal ${proposalId} locked after signature completion`);

            return NextResponse.json({
                ok: true,
                message: "Proposal locked successfully",
                proposalId: proposal.id,
            });
        }

        // Handle other events (log but don't take action)
        console.log(`DocuSign webhook: Event ${payload.event} received`, payload.data);

        return NextResponse.json({ ok: true, message: "Webhook received" });
    } catch (error: any) {
        console.error("DocuSign webhook error:", error);
        return NextResponse.json(
            { error: error?.message || "Webhook processing failed" },
            { status: 500 }
        );
    }
}

/**
 * GET /api/webhooks/docusign
 * DocuSign webhook verification endpoint
 * DocuSign sends a GET request to verify the webhook URL
 */
export async function GET(req: NextRequest) {
    const challenge = req.nextUrl.searchParams.get("challenge");
    
    if (challenge) {
        // Return challenge value to verify webhook URL
        return NextResponse.json({ challenge });
    }

    return NextResponse.json({ message: "DocuSign webhook endpoint" });
}
