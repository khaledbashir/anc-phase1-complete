// Next
import { NextResponse } from "next/server";

// Utils
import numberToWords from "number-to-words";

// Currencies
import currenciesDetails from "@/public/assets/data/currencies.json";
import { CurrencyDetails } from "@/types";
import { CURRENCY_FORMAT } from "@/services/rfp/productCatalog";

type SupportedCurrencyCode = "USD" | "CAD" | "EUR" | "GBP";
const SUPPORTED_CURRENCY_CODES: Set<SupportedCurrencyCode> = new Set(["USD", "CAD", "EUR", "GBP"]);
const CURRENCY_LOCALES: Record<SupportedCurrencyCode, string> = {
    USD: "en-US",
    CAD: "en-CA",
    EUR: "de-DE",
    GBP: "en-GB",
};

const isSupportedCurrencyCode = (value: string): value is SupportedCurrencyCode =>
    SUPPORTED_CURRENCY_CODES.has(value as SupportedCurrencyCode);

/**
 * Formats a number with commas and decimal places
 *
 * @param {number} number - Number to format
 * @returns {string} A styled number to be displayed on the proposal
 */
/**
 * Sanitize brightness/spec values by stripping "nits" text before parsing
 * Handles strings like "444 nits", "444Nits", "444 nits brightness", etc.
 * @param value - The value to sanitize (string or number)
 * @returns Cleaned number or 0 if unparseable
 */
export const cleanNitsFromSpecs = (value: any): number => {
    if (value == null) return 0;
    
    // If already a number, return as-is
    if (typeof value === 'number') {
        return isNaN(value) ? 0 : value;
    }
    
    // Convert to string and clean
    const str = String(value).trim();
    
    // Remove "nits" (case-insensitive) and any surrounding whitespace
    const cleaned = str.replace(/nits?\s*$/i, '').trim();
    
    // Parse the cleaned string
    const parsed = parseFloat(cleaned);
    
    return isNaN(parsed) ? 0 : parsed;
};

/**
 * UAT: Pixel pitch sanity guard.
 * LED pixel pitch realistically ranges 0.5mm–50mm. If a value > 50 appears,
 * it's almost certainly a decimal-stripped artifact (e.g. 125 → 1.25, 1875 → 1.875).
 * Returns corrected number.
 */
export const normalizePitch = (value: any): number => {
    if (value == null) return 0;
    let num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num) || num <= 0) return 0;
    // Heuristic: pitch > 100 likely means ×100 scale (1.25 stored as 125, 1.875 as 1875)
    if (num > 100) num = num / 100;
    // Pitch between 50-100 likely means ×10 scale (39 = 3.9)
    if (num > 50) num = num / 10;
    return num;
};

/**
 * UAT: The word "Nits" must never appear in client-facing copy. Replace with "Brightness".
 * Use on Display Name, Description, and any rendered spec text (e.g. "2.5MM SMD - 1000 NITS" -> "2.5MM SMD - 1000 Brightness").
 */
export const sanitizeNitsForDisplay = (text: string | null | undefined): string => {
    if (text == null || typeof text !== 'string') return '';
    return text.replace(/\s*nits\b/gi, ' Brightness').replace(/\bnits\b/gi, 'Brightness').trim();
};

/**
 * UAT: Natalia requested removal of "Pixel Density" and "HDR Status" from client PDFs (technical fluff).
 * Strip these phrases and their values from spec/description text.
 */
export const stripDensityAndHDRFromSpecText = (text: string | null | undefined): string => {
    if (text == null || typeof text !== 'string') return '';
    let out = text
        .replace(/\s*Pixel\s+Density[^.]*\.?\s*[\d.]*\s*pixels?[^;\n]*/gi, '')
        .replace(/\s*HDR\s+Status[^;\n]*/gi, '');
    return out.replace(/\s{2,}/g, ' ').trim();
};

const formatNumberWithCommas = (number: number | string) => {
    // Handle string inputs with "nits" suffix
    const cleaned = typeof number === 'string' ? cleanNitsFromSpecs(number) : number;
    const num = typeof cleaned === 'number' ? cleaned : parseFloat(String(cleaned));
    
    if (num == null || isNaN(num)) return "0.00";
    return num.toLocaleString("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * REQ-125: Format currency with professional placeholder for zero/undefined values
 * @param amount - The amount to format
 * @param placeholderOrCurrency - Optional placeholder for zero values, or currency code for backward compatibility
 * @param currencyOverride - Optional explicit currency code
 * @returns Formatted currency string or placeholder
 */
export const formatCurrency = (
    amount: number | undefined | null,
    placeholderOrCurrency?: string,
    currencyOverride?: SupportedCurrencyCode
) => {
    const secondArg = (placeholderOrCurrency || "").toUpperCase();
    const currencyFromSecondArg = isSupportedCurrencyCode(secondArg) ? secondArg : undefined;
    const placeholder = currencyFromSecondArg ? undefined : placeholderOrCurrency;
    const currency: SupportedCurrencyCode = currencyOverride || currencyFromSecondArg || "USD";
    const locale = CURRENCY_LOCALES[currency];

    // Use placeholder for zero/undefined or negligible amounts when caller provides one (e.g. "—" in PDF)
    const val = amount ?? 0;
    if (placeholder != null && (val === 0 || Math.abs(val) < 0.01)) return placeholder;
    if (amount === undefined || amount === null || amount === 0) {
        if (placeholder) return placeholder;
    }
    const scale = 10 ** CURRENCY_FORMAT.decimals;
    const roundedAmount = Math.round(val * scale) / scale;
    const normalizedAmount = Object.is(roundedAmount, -0) ? 0 : roundedAmount;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: CURRENCY_FORMAT.decimals,
        maximumFractionDigits: CURRENCY_FORMAT.decimals,
    }).format(normalizedAmount);
};

/**
 * REQ-125: Format currency for PDF - always uses placeholder for zero values
 * Use this in PDF templates to ensure professional appearance
 */
export const formatCurrencyForPdf = (
    amount: number | undefined | null,
    placeholderText = "[PRICE]",
    currency: SupportedCurrencyCode = "USD"
) => {
    if (amount === undefined || amount === null || Math.abs(amount) < 0.01) {
        return placeholderText;
    }
    const locale = CURRENCY_LOCALES[currency];
    const scale = 10 ** CURRENCY_FORMAT.decimals;
    const roundedAmount = Math.round(amount * scale) / scale;
    const normalizedAmount = Object.is(roundedAmount, -0) ? 0 : roundedAmount;

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: CURRENCY_FORMAT.decimals,
        maximumFractionDigits: CURRENCY_FORMAT.decimals,
    }).format(normalizedAmount);
};

/**
 * @param {string} currency - The currency that is currently selected 
 * @returns {Object} - An object containing the currency details as
 * ```
 * {
    "currency": "United Arab Emirates Dirham",
    "decimals": 2,
    "beforeDecimal": "Dirham",
    "afterDecimal": "Fils"
 }
 */
const fetchCurrencyDetails = (currency: string): CurrencyDetails | null => {
    const data = currenciesDetails as Record<string, CurrencyDetails>;
    const currencyDetails = data[currency];
    return currencyDetails || null;
};


/**
 * Turns a number into words for proposals
 *
 * @param {number} price - Number to format
 * @returns {string} Number in words
 */
const formatPriceToString = (price: number, currency: string): string => {
    // Safety check for NaN or infinite numbers
    if (!Number.isFinite(price) || isNaN(price)) {
        return "Zero";
    }

    // Initialize variables
    let decimals: number;
    let beforeDecimal: string | null = null;
    let afterDecimal: string | null = null;

    const currencyDetails = fetchCurrencyDetails(currency);

    // If currencyDetails is available, use its values, else dynamically set decimals
    if (currencyDetails) {
        decimals = currencyDetails.decimals;
        beforeDecimal = currencyDetails.beforeDecimal;
        afterDecimal = currencyDetails.afterDecimal;
    } else {
        // Dynamically get decimals from the price if currencyDetails is null
        const priceString = price.toString();
        const decimalIndex = priceString.indexOf('.');
        decimals = decimalIndex !== -1 ? priceString.split('.')[1].length : 0;
    }

    // Ensure the price is rounded to the appropriate decimal places
    const roundedPrice = parseFloat(price.toFixed(decimals));

    // Split the price into integer and fractional parts
    const integerPart = Math.floor(roundedPrice);

    const fractionalMultiplier = Math.pow(10, decimals);
    const fractionalPart = Math.round((roundedPrice - integerPart) * fractionalMultiplier);

    // Convert the integer part to words with a capitalized first letter
    const integerPartInWords = numberToWords
        .toWords(integerPart)
        .replace(/^\w/, (c) => c.toUpperCase());

    // Convert fractional part to words
    const fractionalPartInWords =
        fractionalPart > 0
            ? numberToWords.toWords(fractionalPart)
            : null;

    // Handle zero values for both parts
    if (integerPart === 0 && fractionalPart === 0) {
        return "Zero";
    }

    // Combine the parts into the final string
    let result = integerPartInWords;

    // Check if beforeDecimal is not null 
    if (beforeDecimal !== null) {
        result += ` ${beforeDecimal}`;
    }

    if (fractionalPartInWords) {
        // Check if afterDecimal is not null
        if (afterDecimal !== null) {
            // Concatenate the after decimal and fractional part
            result += ` and ${fractionalPartInWords} ${afterDecimal}`;
        } else {
            // If afterDecimal is null, concatenate the fractional part
            result += ` point ${fractionalPartInWords}`;
        }
    }

    return result;
};

/**
 * This method flattens a nested object. It is used for xlsx export
 *
 * @param {Record<string, T>} obj - A nested object to flatten
 * @param {string} parentKey - The parent key
 * @returns {Record<string, T>} A flattened object
 */
const flattenObject = <T>(
    obj: Record<string, T>,
    parentKey = ""
): Record<string, T> => {
    const result: Record<string, T> = {};

    for (const key in obj) {
        if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
            const flattened = flattenObject(
                obj[key] as Record<string, T>,
                parentKey + key + "_"
            );
            for (const subKey in flattened) {
                result[parentKey + subKey] = flattened[subKey];
            }
        } else {
            result[parentKey + key] = obj[key];
        }
    }

    return result;
};

/**
 * A method to validate an email address
 *
 * @param {string} email - Email to validate
 * @returns {boolean} A boolean indicating if the email is valid
 */
const isValidEmail = (email: string) => {
    // Regular expression for a simple email pattern
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
};

/**
 * A method to check if a string is a data URL
 *
 * @param {string} str - String to check
 * @returns {boolean} Boolean indicating if the string is a data URL
 */
const isDataUrl = (str: string) => str.startsWith("data:");

/**
 * Dynamically imports and retrieves an proposal template React component based on the provided template ID.
 *
 * @param {number} templateId - The ID of the proposal template.
 * @returns {Promise<React.ComponentType<any> | null>} A promise that resolves to the proposal template component or null if not found.
 * @throws {Error} Throws an error if there is an issue with the dynamic import or if a default template is not available.
 */
const getProposalTemplate = async (templateId: number) => {
    // Map template IDs to component names
    // Template 5 (ANC Hybrid) is the enterprise standard
    // Templates 1, 2 (Classic), and 4 (Premium) are deprecated and map to 5 (Hybrid)
    const DEPRECATED_TEMPLATES = [1, 2, 3, 4];
    const actualId = DEPRECATED_TEMPLATES.includes(templateId) ? 5 : templateId;
    if (templateId !== actualId) {
        console.info(`[PDF] Remapping deprecated template ${templateId} → ${actualId} (Hybrid)`);
    }
    const templateName = `ProposalTemplate${actualId}`;

    try {
        const module = await import(
            `@/app/components/templates/proposal-pdf/${templateName}`
        );
        return module.default;
    } catch (err) {
        console.error(`[PDF] Error importing ${templateName}: ${err}`);
        return null;
    }
};

/**
 * Convert a file to a buffer. Used for sending proposal as email attachment.
 * @param {File} file - The file to convert to a buffer.
 * @returns {Promise<Buffer>} A promise that resolves to a buffer.
 */
const fileToBuffer = async (file: File) => {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await new NextResponse(file).arrayBuffer();

    // Convert ArrayBuffer to Buffer
    const pdfBuffer = Buffer.from(arrayBuffer);

    return pdfBuffer;
};

export {
    formatNumberWithCommas,
    formatPriceToString,
    flattenObject,
    isValidEmail,
    isDataUrl,
    getProposalTemplate,
    fileToBuffer,
};
