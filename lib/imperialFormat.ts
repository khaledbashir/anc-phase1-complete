/**
 * Imperial formatting utilities for the Metric Mirror.
 *
 * Converts decimal feet to human-readable Feet'-Inches" format
 * that Matt and the sales team expect on proposals.
 */

/**
 * Convert decimal feet to Feet'-Inches" string.
 * Examples:
 *   9.8399 → "9'-10\""
 *   20.0   → "20'-0\""
 *   0.5    → "0'-6\""
 *   12.25  → "12'-3\""
 */
export function feetToFeetInches(decimalFeet: number): string {
    if (!Number.isFinite(decimalFeet) || decimalFeet < 0) return "0'-0\"";

    const totalInches = decimalFeet * 12;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);

    // Handle rounding: 11.5+ inches rounds to next foot
    if (inches >= 12) {
        return `${feet + 1}'-0"`;
    }

    return `${feet}'-${inches}"`;
}

/**
 * Convert decimal feet to Feet'-Inches" with fractional inches (1/16" precision).
 * Examples:
 *   9.8399 → "9'-10 1/16\""
 *   20.0   → "20'-0\""
 */
export function feetToFeetInchesFraction(decimalFeet: number): string {
    if (!Number.isFinite(decimalFeet) || decimalFeet < 0) return "0'-0\"";

    const totalInches = decimalFeet * 12;
    const feet = Math.floor(totalInches / 12);
    const remainingInches = totalInches % 12;
    const wholeInches = Math.floor(remainingInches);
    const fraction = remainingInches - wholeInches;

    // Snap to nearest 1/16
    const sixteenths = Math.round(fraction * 16);

    if (sixteenths === 0) {
        return `${feet}'-${wholeInches}"`;
    }
    if (sixteenths === 16) {
        return `${feet}'-${wholeInches + 1}"`;
    }

    // Simplify fraction
    const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(sixteenths, 16);
    const num = sixteenths / d;
    const den = 16 / d;

    return `${feet}'-${wholeInches} ${num}/${den}"`;
}

/**
 * Convert millimeters to decimal feet.
 */
export function mmToFeet(mm: number): number {
    return mm / 304.8;
}

/**
 * Convert decimal feet to millimeters.
 */
export function feetToMm(feet: number): number {
    return feet * 304.8;
}

/**
 * Convert millimeters to meters string (e.g. "3.048m").
 */
export function mmToMeters(mm: number): string {
    return `${(mm / 1000).toFixed(3)}m`;
}

/**
 * Format a delta in inches with +/- sign and color hint.
 * Returns { text, isOver } for UI rendering.
 */
export function formatDeltaInches(deltaFt: number): { text: string; isOver: boolean } {
    const deltaInches = deltaFt * 12;
    const rounded = Math.round(deltaInches * 100) / 100;
    const sign = rounded >= 0 ? "+" : "";
    return {
        text: `${sign}${rounded}"`,
        isOver: rounded > 0,
    };
}
