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

