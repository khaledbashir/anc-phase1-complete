/**
 * sanitizeForClient - Security Gate for Share Link Generation
 * 
 * P0 REQUIREMENT: Strip all internal cost, margin, and sensitive AI metadata from client-facing views
 * 
 * PRD Mandate (Section 4.12): Strictly forbid leaking internal costs via public Share Link
 * 
 * Strategy:
 * 1. Deep clone using JSON.parse(JSON.stringify()) to break all references
 * 2. Strip denylist fields recursively
 * 3. Apply placeholder logic for missing values
 * 4. Ensure structural costs are hidden or aggregated
 */

// ============================================================================
// DENYLIST: Fields that MUST NEVER appear in client exports
// ============================================================================
const SECURITY_DENYLIST = [
    'cost',
    'margin',
    'marginPercentage',
    'desiredMargin',
    'ancMargin',
    'marginAmount',
    'hardwareCost',
    'laborCost',
    'structureCost',
    'installCost',
    'shippingCost',
    'costPerSqFt',
    'ledCostPerSqFt',
    'structuralTonnage',
    'reinforcingTonnage',
    'bondRateOverride',
    'taxRateOverride',
    'costBasis',
    'marginValue',
    'overheadRate',
    'profitRate',
    'structuralSteelRate',
    'aiSource',
    'citations',
    'aiFilledFields',
    'verifiedFields',
    'aiFieldTimestamps',
    'blueGlowMetadata',
    'internalNotes',
    'vendorPricing',
    'contractorRates',
];

// Fields to replace with placeholder values (do NOT inject projectTotal — template shows "—" or real total)
const PLACEHOLDER_FIELDS = {
    costBasis: '[COST BASIS]',
    structuralSteel: '[STRUCTURAL STEEL]',
};

/**
 * Sanitize proposal data for client-facing export
 * 
 * @param data - Raw proposal data object
 * @returns Sanitized data safe for client consumption
 */
export function sanitizeForClient<T = any>(data: T): T {
    // P0: Deep clone to break all references to database object
    const clone = JSON.parse(JSON.stringify(data));

    // Recursively strip denylist fields
    const sanitized = stripFields(clone);

    // Apply placeholder logic
    return applyPlaceholders(sanitized as any) as T;
}

/**
 * Recursively strip denylist fields from object
 */
function stripFields(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(stripFields);
    }

    if (obj && typeof obj === 'object') {
        const sanitized: any = {};

        for (const [key, value] of Object.entries(obj)) {
            // Skip denylist fields
            if (SECURITY_DENYLIST.includes(key)) {
                continue;
            }

            // Recursively process nested objects
            sanitized[key] = stripFields(value);
        }

        return sanitized;
    }

    return obj;
}

/**
 * Apply placeholder logic for sensitive numeric fields
 */
function applyPlaceholders(obj: any): any {
    if (Array.isArray(obj)) {
        return obj.map(applyPlaceholders);
    }

    if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
            // Apply placeholders (projectTotal removed: PDF/template shows "—" or real total, not literal "[PROJECT TOTAL]")
            if (key === 'costBasis' && (value === 0 || value === undefined || value === null)) {
                obj[key] = PLACEHOLDER_FIELDS.costBasis;
            }
            if (key === 'structuralSteel' && (value === 0 || value === undefined || value === null)) {
                obj[key] = PLACEHOLDER_FIELDS.structuralSteel;
            }

            // Recursively process nested objects
            if (typeof value === 'object' && value !== null) {
                obj[key] = applyPlaceholders(value);
            }
        }

        return obj;
    }

    return obj;
}

/**
 * Specific sanitization for line items (pricing table)
 * Hides structural costs or aggregates into main display price
 */
export function sanitizeLineItems(lineItems: any[]): any[] {
    return lineItems.map(item => {
        const sanitized: any = {
            ...item,
            // Zero out internal costs
            cost: 0,
            margin: 0,
            marginPercentage: 0,
        };

        // If this is structural steel, hide or aggregate
        if (item.category?.toLowerCase().includes('structural') ||
            item.category?.toLowerCase().includes('steel')) {
            // Option 1: Hide completely
            return null;

            // Option 2 (alternative): Aggregate into main display (not implemented here)
            // This would require summing into a parent category
        }

        return sanitized;
    }).filter(item => item !== null); // Remove hidden items
}

/**
 * Validate that data is sanitized (for testing/debugging)
 */
export function validateSanitized(data: any): boolean {
    const dataStr = JSON.stringify(data).toLowerCase();

    // Check for leaked internal fields
    const leakedFields = SECURITY_DENYLIST.filter(field =>
        dataStr.includes(field.toLowerCase()) &&
        !field.toLowerCase().includes('internal') // Allow 'internalAudit' field name itself
    );

    return leakedFields.length === 0;
}

export {
    SECURITY_DENYLIST,
    PLACEHOLDER_FIELDS,
};