/**
 * Serper Google Search API Client
 * Fallback for venue/stadium address lookups when LLM services are unavailable
 */

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_ENDPOINT = "https://google.serper.dev/search";

export interface SerperSearchResult {
    title: string;
    link: string;
    snippet: string;
    position: number;
}

export interface SerperKnowledgeGraph {
    title?: string;
    type?: string;
    description?: string;
    attributes?: Record<string, string>;
}

export interface SerperResponse {
    searchParameters?: { q: string };
    knowledgeGraph?: SerperKnowledgeGraph;
    organic?: SerperSearchResult[];
}

/**
 * Search Google via Serper API
 */
export async function searchSerper(query: string): Promise<SerperResponse | null> {
    if (!SERPER_API_KEY) return null;
    try {
        const res = await fetch(SERPER_ENDPOINT, {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: query,
                num: 5,
            }),
        });

        if (!res.ok) {
            console.error("[Serper] Search failed:", res.status, res.statusText);
            return null;
        }

        return await res.json();
    } catch (error) {
        console.error("[Serper] Search error:", error);
        return null;
    }
}

/**
 * Extract address information from Serper search results
 * Searches for stadium/venue addresses in knowledge graph and organic results
 */
export async function searchVenueAddress(
    query: string,
    targetFields: string[]
): Promise<Record<string, string> | null> {
    // First, search for the venue with "address" appended
    const addressResult = await searchSerper(`${query} address location`);

    if (!addressResult) return null;

    const results: Record<string, string> = {};

    // Try to extract from knowledge graph first (most reliable)
    const kg = addressResult.knowledgeGraph;
    if (kg) {
        // Try attributes for address info
        if (kg.attributes) {
            const attrs = kg.attributes;

            // Look for address-related keys
            const addressKeys = ["Address", "Location", "Headquarters"];
            for (const key of addressKeys) {
                if (attrs[key]) {
                    const parts = parseAddressString(attrs[key]);
                    if (parts.address) results["receiver.address"] = parts.address;
                    if (parts.city) results["receiver.city"] = parts.city;
                    if (parts.state) results["receiver.state"] = parts.state;
                    if (parts.zipCode) results["receiver.zipCode"] = parts.zipCode;
                    break;
                }
            }
        }

        // Use title as venue name if available
        if (kg.title) {
            results["details.venue"] = kg.title;
        }
    }

    // Try to extract from organic results if knowledge graph didn't have address
    if (!results["receiver.address"] && addressResult.organic && addressResult.organic.length > 0) {
        for (const result of addressResult.organic.slice(0, 3)) {
            const snippet = result.snippet || "";
            const parts = extractAddressFromText(snippet);
            if (parts && parts.address) {
                results["receiver.address"] = parts.address;
                if (parts.city) results["receiver.city"] = parts.city;
                if (parts.state) results["receiver.state"] = parts.state;
                if (parts.zipCode) results["receiver.zipCode"] = parts.zipCode;
                break;
            }
        }
    }

    return Object.keys(results).length > 0 ? results : null;
}

/**
 * Parse a typical US address string into components
 */
function parseAddressString(address: string): {
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
} {
    const result: ReturnType<typeof parseAddressString> = {};

    // Common US address format: "123 Main St, City, ST 12345"
    // Or: "123 Main Street, City, State 12345"

    // Try to extract ZIP code first
    const zipMatch = address.match(/\b(\d{5}(-\d{4})?)\b/);
    if (zipMatch) {
        result.zipCode = zipMatch[1];
    }

    // Try to extract state abbreviation
    const stateMatch = address.match(/\b([A-Z]{2})\s*\d{5}/);
    if (stateMatch) {
        result.state = stateMatch[1];
    }

    // Split by comma and try to parse
    const parts = address.split(",").map(p => p.trim());
    if (parts.length >= 2) {
        result.address = parts[0];

        // Second part might be city or city + state
        const cityPart = parts[1];
        const cityStateMatch = cityPart.match(/^(.+?)\s+([A-Z]{2})$/);
        if (cityStateMatch) {
            result.city = cityStateMatch[1].trim();
            result.state = cityStateMatch[2];
        } else {
            result.city = cityPart.replace(/\s*\d{5}(-\d{4})?\s*$/, "").trim();
        }
    }

    return result;
}

/**
 * Try to extract address from freeform text
 */
function extractAddressFromText(text: string): ReturnType<typeof parseAddressString> | null {
    // Look for street number followed by street name pattern
    const streetMatch = text.match(/(\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Way|Lane|Ln|Pl|Place|Pkwy|Parkway)))/i);

    if (!streetMatch) return null;

    const result: ReturnType<typeof parseAddressString> = {
        address: streetMatch[1],
    };

    // Try to find city/state/zip after the street address
    const afterAddress = text.slice(text.indexOf(streetMatch[0]) + streetMatch[0].length);

    // ZIP code
    const zipMatch = afterAddress.match(/\b(\d{5}(-\d{4})?)\b/);
    if (zipMatch) {
        result.zipCode = zipMatch[1];
    }

    // State abbreviation before ZIP
    const stateMatch = afterAddress.match(/\b([A-Z]{2})\s*\d{5}/);
    if (stateMatch) {
        result.state = stateMatch[1];
    }

    // City - look for capitalized words before state
    const cityMatch = afterAddress.match(/,?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*[A-Z]{2}/);
    if (cityMatch) {
        result.city = cityMatch[1];
    }

    return result;
}
