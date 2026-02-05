export interface VerificationMetadata {
    verifiedBy: string;
    verifiedAt: string;
}

/**
 * verifyField
 * Marks an AI-filled field as verified and logs the audit trail.
 */
export function verifyField(
    existingVerifiedFields: Record<string, VerificationMetadata> = {},
    fieldPath: string,
    userName: string
): Record<string, VerificationMetadata> {
    return {
        ...existingVerifiedFields,
        [fieldPath]: {
            verifiedBy: userName,
            verifiedAt: new Date().toISOString(),
        },
    };
}

/**
 * isFieldVerified
 * Checks if a specific field path has been verified.
 */
export function isFieldVerified(
    verifiedFields: Record<string, VerificationMetadata> | undefined,
    fieldPath: string
): boolean {
    if (!verifiedFields) return false;
    return !!verifiedFields[fieldPath];
}

/**
 * getFieldVerificationInfo
 * Returns the audit trail info for a verified field.
 */
export function getFieldVerificationInfo(
    verifiedFields: Record<string, VerificationMetadata> | undefined,
    fieldPath: string
): VerificationMetadata | null {
    if (!verifiedFields) return null;
    return verifiedFields[fieldPath] || null;
}
