/**
 * Rounding Audit
 * Tracks all rounding operations for ANC's HALF_EVEN rounding contract
 */

import Decimal from 'decimal.js';

// ============================================================================
// ROUNDING OPERATION LOGGING
// ============================================================================

/**
 * Rounding operation record
 */
export interface RoundingOperation {
    stage: string;              // 'Subtotal', 'Bond', 'B&O', 'Sales Tax', 'Final Total'
    input: Decimal;             // Input value before rounding
    rounded: Decimal;           // Output value after rounding
    delta: Decimal;             // Difference (rounded - input)
    roundingMode: string;       // 'ROUND_HALF_EVEN'
    timestamp: string;          // When the operation occurred
}

/**
 * Rounding audit summary
 */
export interface RoundingAuditSummary {
    operations: RoundingOperation[];
    totalDrift: Decimal;        // Sum of all deltas
    maxDrift: Decimal;          // Maximum absolute delta
    avgDrift: Decimal;          // Average absolute delta
    allHalfEven: boolean;       // All operations used HALF_EVEN
    onlyCategoryTotals: boolean; // No intermediate rounding
}

// ============================================================================
// ROUNDING AUDIT CLASS
// ============================================================================

class RoundingAudit {
    private operations: RoundingOperation[] = [];
    
    /**
     * Log a rounding operation
     */
    log(operation: RoundingOperation): void {
        this.operations.push(operation);
    }
    
    /**
     * Get all rounding operations
     */
    getOperations(): RoundingOperation[] {
        return [...this.operations];
    }
    
    /**
     * Get operations by stage
     */
    getOperationsByStage(stage: string): RoundingOperation[] {
        return this.operations.filter(op => op.stage === stage);
    }
    
    /**
     * Get audit summary
     */
    getSummary(): RoundingAuditSummary {
        if (this.operations.length === 0) {
            return {
                operations: [],
                totalDrift: new Decimal(0),
                maxDrift: new Decimal(0),
                avgDrift: new Decimal(0),
                allHalfEven: true,
                onlyCategoryTotals: true,
            };
        }
        
        // Calculate drift statistics
        const deltas = this.operations.map(op => op.delta);
        const totalDrift = deltas.reduce((sum, delta) => sum.plus(delta), new Decimal(0));
        const absDeltas = deltas.map(d => d.abs());
        const maxDrift = absDeltas.reduce((max, d) => d.greaterThan(max) ? d : max, new Decimal(0));
        const avgDrift = absDeltas.reduce((sum, d) => sum.plus(d), new Decimal(0))
            .div(new Decimal(this.operations.length));
        
        // Check all operations used HALF_EVEN
        const allHalfEven = this.operations.every(op => op.roundingMode === 'ROUND_HALF_EVEN');
        
        // Check no intermediate rounding (only category totals)
        const allowedStages = ['Subtotal', 'Bond', 'B&O', 'Sales Tax', 'Final Total'];
        const onlyCategoryTotals = this.operations.every(op => allowedStages.includes(op.stage));
        
        return {
            operations: [...this.operations],
            totalDrift,
            maxDrift,
            avgDrift,
            allHalfEven,
            onlyCategoryTotals,
        };
    }
    
    /**
     * Clear all operations
     */
    clear(): void {
        this.operations = [];
    }
    
    /**
     * Check if rounding drift is within acceptable threshold
     */
    isDriftAcceptable(threshold: Decimal = new Decimal(0.01)): boolean {
        const summary = this.getSummary();
        return summary.maxDrift.lessThanOrEqualTo(threshold);
    }
}

// ============================================================================
// GLOBAL INSTANCE
// ============================================================================

const roundingAudit = new RoundingAudit();

/**
 * Log a rounding operation to the global audit
 */
export function logRoundingOperation(operation: RoundingOperation): void {
    roundingAudit.log(operation);
}

/**
 * Get all rounding operations from the global audit
 */
export function getRoundingOperations(): RoundingOperation[] {
    return roundingAudit.getOperations();
}

/**
 * Get rounding audit summary from the global audit
 */
export function getRoundingAuditSummary(): RoundingAuditSummary {
    return roundingAudit.getSummary();
}

/**
 * Clear all rounding operations from the global audit
 */
export function clearRoundingAudit(): void {
    roundingAudit.clear();
}

/**
 * Check if rounding drift is acceptable
 */
export function isRoundingDriftAcceptable(threshold: Decimal = new Decimal(0.01)): boolean {
    return roundingAudit.isDriftAcceptable(threshold);
}

// ============================================================================
// ROUNDING HELPERS (HALF_EVEN)
// ============================================================================

/**
 * Round to cents using HALF_EVEN
 * This is the PRIMARY rounding function for ANC's rounding contract
 */
export function roundToCents(value: Decimal | number | string): Decimal {
    const decimal = new Decimal(value);
    return decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN);
}

/**
 * Round a category total and log the operation
 * Use this for: Subtotal, Bond, B&O, Sales Tax, Final Total
 */
export function roundCategoryTotal(
    value: Decimal | number | string,
    category: string
): Decimal {
    const input = new Decimal(value);
    const rounded = roundToCents(input);
    const delta = rounded.minus(input);
    
    // Log the rounding operation
    logRoundingOperation({
        stage: category,
        input,
        rounded,
        delta,
        roundingMode: 'ROUND_HALF_EVEN',
        timestamp: new Date().toISOString(),
    });
    
    return rounded;
}

// ============================================================================
// EXPORTS
// ============================================================================

export { RoundingAudit };
export default roundingAudit;
