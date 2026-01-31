/**
 * Proposal Lifecycle State Machine (REQ-114: Section 4.14 & 9.2)
 * 
 * States: DRAFT → PENDING_REVIEW → APPROVED → SIGNED → CLOSED
 * 
 * CRITICAL RULES:
 * 1. SIGNED/CLOSED proposals are IMMUTABLE - no edits allowed
 * 2. Editing a signed proposal triggers AUTO-CLONE to new Draft
 * 3. E-Signature requires full audit trail (IP, email, hash)
 */

import crypto from "crypto";

// Valid state transitions
const STATE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["PENDING_REVIEW", "CANCELLED"],
  PENDING_REVIEW: ["APPROVED", "DRAFT", "CANCELLED"],
  APPROVED: ["SIGNED", "DRAFT", "CANCELLED"],
  SIGNED: ["CLOSED"], // Cannot go back - IMMUTABLE
  CLOSED: [], // Terminal state - IMMUTABLE
  CANCELLED: ["DRAFT"], // Can reopen as draft
};

// Immutable states - NO EDITS ALLOWED
const IMMUTABLE_STATES = ["SIGNED", "CLOSED"];

export type ProposalStatus = 
  | "DRAFT" 
  | "PENDING_REVIEW" 
  | "APPROVED" 
  | "SIGNED" 
  | "CLOSED" 
  | "CANCELLED";

export interface SignaturePayload {
  signerEmail: string;
  signerName: string;
  signerTitle?: string;
  signerRole: "ANC_REPRESENTATIVE" | "PURCHASER";
  ipAddress: string;
  userAgent?: string;
  authMethod: "EMAIL_LINK" | "SSO" | "MANUAL";
}

/**
 * Check if a state transition is valid
 */
export function canTransition(from: string, to: string): boolean {
  const allowed = STATE_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Check if proposal is in an immutable state
 */
export function isImmutable(status: string): boolean {
  return IMMUTABLE_STATES.includes(status);
}

/**
 * Generate SHA-256 hash of proposal data for integrity verification
 */
export function generateDocumentHash(proposalData: any): string {
  const normalized = JSON.stringify(proposalData, Object.keys(proposalData).sort());
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

/**
 * Validate edit attempt - throws if proposal is immutable
 */
export function validateEditAttempt(status: string, proposalId: string): { 
  allowed: boolean; 
  requiresClone: boolean;
  message: string;
} {
  if (isImmutable(status)) {
    return {
      allowed: false,
      requiresClone: true,
      message: `Proposal is ${status} and cannot be edited. Create a new version (clone) to make changes.`
    };
  }
  return {
    allowed: true,
    requiresClone: false,
    message: "Edit allowed"
  };
}

/**
 * Prepare signature transition - validates and returns lock data
 */
export function prepareSignatureTransition(
  currentStatus: string,
  proposalData: any,
  signaturePayload: SignaturePayload
): {
  valid: boolean;
  error?: string;
  lockData?: {
    status: "SIGNED";
    isLocked: true;
    lockedAt: Date;
    documentHash: string;
  };
  auditTrailData?: {
    signerEmail: string;
    signerName: string;
    signerTitle: string | null;
    signerRole: string;
    ipAddress: string;
    userAgent: string | null;
    authMethod: string;
    documentHash: string;
    signedAt: Date;
  };
} {
  // Validate transition
  if (!canTransition(currentStatus, "SIGNED")) {
    return {
      valid: false,
      error: `Cannot transition from ${currentStatus} to SIGNED. Must be in APPROVED state.`
    };
  }

  // Validate signature payload
  if (!signaturePayload.signerEmail || !signaturePayload.signerName) {
    return {
      valid: false,
      error: "Signer email and name are required for signature."
    };
  }

  if (!signaturePayload.ipAddress) {
    return {
      valid: false,
      error: "IP address is required for audit trail."
    };
  }

  // Generate document hash
  const documentHash = generateDocumentHash(proposalData);
  const now = new Date();

  return {
    valid: true,
    lockData: {
      status: "SIGNED",
      isLocked: true,
      lockedAt: now,
      documentHash,
    },
    auditTrailData: {
      signerEmail: signaturePayload.signerEmail,
      signerName: signaturePayload.signerName,
      signerTitle: signaturePayload.signerTitle || null,
      signerRole: signaturePayload.signerRole,
      ipAddress: signaturePayload.ipAddress,
      userAgent: signaturePayload.userAgent || null,
      authMethod: signaturePayload.authMethod,
      documentHash,
      signedAt: now,
    }
  };
}

/**
 * Prepare clone data for creating new version from signed proposal
 */
export function prepareCloneData(
  originalProposal: any,
  originalId: string,
  currentVersion: number
): {
  cloneData: any;
  newVersion: number;
} {
  // Deep clone and reset mutable fields
  const cloneData = JSON.parse(JSON.stringify(originalProposal));
  
  // Reset lifecycle fields
  cloneData.status = "DRAFT";
  cloneData.isLocked = false;
  cloneData.lockedAt = null;
  cloneData.documentHash = null;
  cloneData.parentProposalId = originalId;
  cloneData.versionNumber = currentVersion + 1;
  
  // Clear IDs (will be regenerated)
  delete cloneData.id;
  delete cloneData.createdAt;
  delete cloneData.updatedAt;
  delete cloneData.shareHash;
  
  // Update name to indicate version
  if (cloneData.clientName) {
    cloneData.clientName = `${cloneData.clientName} (v${currentVersion + 1})`;
  }

  return {
    cloneData,
    newVersion: currentVersion + 1
  };
}

/**
 * State machine summary for UI display
 */
export function getStatusInfo(status: string): {
  label: string;
  color: string;
  canEdit: boolean;
  canSign: boolean;
  canClose: boolean;
} {
  const info: Record<string, any> = {
    DRAFT: { label: "Draft", color: "yellow", canEdit: true, canSign: false, canClose: false },
    PENDING_REVIEW: { label: "Pending Review", color: "blue", canEdit: true, canSign: false, canClose: false },
    APPROVED: { label: "Approved", color: "green", canEdit: true, canSign: true, canClose: false },
    SIGNED: { label: "Signed", color: "purple", canEdit: false, canSign: false, canClose: true },
    CLOSED: { label: "Closed", color: "gray", canEdit: false, canSign: false, canClose: false },
    CANCELLED: { label: "Cancelled", color: "red", canEdit: false, canSign: false, canClose: false },
  };
  return info[status] || info.DRAFT;
}
