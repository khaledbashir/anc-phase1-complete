// Next
import { NextResponse } from "next/server";

// Utils
import numberToWords from "number-to-words";

// Currencies
import currenciesDetails from "@/public/assets/data/currencies.json";
import { CurrencyDetails } from "@/types";

/**
 * Formats a number with commas and decimal places
 *
 * @param {number} number - Number to format
 * @returns {string} A styled number to be displayed on the proposal
 */
const formatNumberWithCommas = (number: number) => {
    if (number == null || isNaN(number)) return "0.00";
    return number.toLocaleString("en-US", {
        style: "decimal",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

/**
 * REQ-125: Format currency with professional placeholder for zero/undefined values
 * @param amount - The amount to format
 * @param placeholder - Optional placeholder for zero values (defaults to formatted $0.00)
 * @returns Formatted currency string or placeholder
 */
export const formatCurrency = (amount: number | undefined | null, placeholder?: string) => {
    // REQ-125: Return placeholder for zero/undefined values in PDF context
    if (amount === undefined || amount === null || amount === 0) {
        // If a placeholder is provided, use it; otherwise return formatted zero
        // This allows callers to opt-in to placeholder behavior
        if (placeholder) return placeholder;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount || 0);
};

/**
 * REQ-125: Format currency for PDF - always uses placeholder for zero values
 * Use this in PDF templates to ensure professional appearance
 */
export const formatCurrencyForPdf = (amount: number | undefined | null, placeholderText = "[PRICE]") => {
    if (amount === undefined || amount === null || Math.abs(amount) < 0.01) {
        return placeholderText;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
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
    // Dynamic template component name
    const componentName = `ProposalTemplate${templateId}`;

    try {
        const module = await import(
            `@/app/components/templates/proposal-pdf/${componentName}`
        );
        return module.default;
    } catch (err) {
        console.error(`Error importing template ${componentName}: ${err}`);

        // Provide a default template
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
