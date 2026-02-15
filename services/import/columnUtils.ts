/**
 * Column letter ↔ index utilities (client-safe — no Node.js dependencies).
 */

/**
 * Convert column letter (e.g. "B", "AA") to 0-based index.
 */
export function colLetterToIndex(letter: string): number {
    let result = 0;
    const upper = letter.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
        result = result * 26 + (upper.charCodeAt(i) - 64);
    }
    return result - 1;
}

/**
 * Convert 0-based column index to letter (e.g. 0 → "A", 25 → "Z", 26 → "AA").
 */
export function colIndexToLetter(index: number): string {
    let result = "";
    let n = index;
    while (n >= 0) {
        result = String.fromCharCode((n % 26) + 65) + result;
        n = Math.floor(n / 26) - 1;
    }
    return result;
}
