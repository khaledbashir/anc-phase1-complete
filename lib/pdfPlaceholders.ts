/**
 * Utility to provide branded placeholders for empty form values in the PDF preview.
 * This prevents the "flicker" of empty space and maintains document structure during drafting.
 */

export const PDF_PLACEHOLDERS = {
    PROJECT_NAME: "[PROJECT NAME]",
    CLIENT_NAME: "[CLIENT NAME]",
    DATE: "[DATE]",
    SALES_PERSON: "[SALES PERSON]",
    TOTAL_PRICE: "[TOTAL PRICE]",
    LOCATION: "[LOCATION]",
    DESCRIPTION: "[PROJECT DESCRIPTION]",
    // REQ-125: Financial placeholders for zero values
    SUBTOTAL: "[SUBTOTAL]",
    BOND_AMOUNT: "[BOND AMOUNT]",
    TAX_AMOUNT: "[TAX AMOUNT]",
    LINE_ITEM_PRICE: "[PRICE]",
    SCREEN_TOTAL: "[SCREEN TOTAL]",
};

/**
 * Returns the value or a branded placeholder if the value is null/empty.
 */
export function withPlaceholder(value: string | number | null | undefined, placeholderKey: keyof typeof PDF_PLACEHOLDERS): string {
    if (value === null || value === undefined || value === "") {
        return PDF_PLACEHOLDERS[placeholderKey];
    }
    return String(value);
}

/**
 * Formats a date or returns the [DATE] placeholder.
 */
export function withDatePlaceholder(date: Date | string | null | undefined): string {
    if (!date) return PDF_PLACEHOLDERS.DATE;
    
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return PDF_PLACEHOLDERS.DATE;
    
    return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });
}
