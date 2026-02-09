/**
 * Enterprise-Grade Math Utilities
 * Tier-1 Precision for ANC Ferrari Platform
 * 
 * Rules:
 * - Dimensions: 2 decimal places
 * - Currency (PDF): 0 decimal places (round to nearest dollar)
 * - Currency (Internal): 2 decimal places
 * - No floating point artifacts (22.959999999999997 → 22.96)
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial precision
Decimal.set({
    precision: 20,
    rounding: Decimal.ROUND_HALF_UP,
});

/**
 * Round to N decimal places with proper handling
 */
export function roundToDecimals(value: number | string | Decimal, decimals: number): number {
    if (value === null || value === undefined || value === '') return 0;
    try {
        const d = new Decimal(value);
        return parseFloat(d.toFixed(decimals));
    } catch {
        return 0;
    }
}

/**
 * Format dimension (feet/inches) - 2 decimal places
 * Example: 22.959999999999997 → 22.96
 */
export function formatDimension(value: number | string | undefined): number {
    if (!value || isNaN(Number(value))) return 0;
    return roundToDecimals(value, 2);
}

/**
 * Format currency for PDF display - 0 decimal places (nearest dollar)
 * Example: $4,999.56 → $5,000
 */
export function formatCurrencyPDF(value: number | string | undefined): number {
    if (!value || isNaN(Number(value))) return 0;
    return roundToDecimals(value, 0);
}

/**
 * Format currency for internal audit - 2 decimal places
 * Example: $4,999.5623 → $4,999.56
 */
export function formatCurrencyInternal(value: number | string | undefined): number {
    if (!value || isNaN(Number(value))) return 0;
    return roundToDecimals(value, 2);
}

/**
 * Calculate area with precision
 * Example: 22.96 × 13.12 = 301.24 (not 301.23519999999997)
 */
export function calculateArea(width: number, height: number): number {
    const w = new Decimal(formatDimension(width));
    const h = new Decimal(formatDimension(height));
    return parseFloat(w.mul(h).toFixed(2));
}

/**
 * Safe number parsing - returns 0 for invalid inputs
 */
export function safeNumber(value: any): number {
    if (value === null || value === undefined || value === '') return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
}

