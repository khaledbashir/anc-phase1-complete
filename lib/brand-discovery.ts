/**
 * Brand Discovery Utility
 * 
 * Functions to auto-discover client brand assets (logos)
 * based on their company name using public APIs.
 */

interface ClearbitSuggestion {
    name: string;
    domain: string;
    logo: string;
}

/**
 * findClientLogo
 * 
 * Uses Clearbit Autocomplete API to find a company's logo.
 * It's a free, no-key-required API for basic brand discovery.
 * 
 * @param clientName The name of the client/company (e.g., "Lakers", "Staples Center")
 * @returns The URL of the logo image or null if not found
 */
export async function findClientLogo(clientName: string): Promise<string | null> {
    if (!clientName || clientName.length < 2) return null;

    try {
        // Clearbit Autocomplete is great for mapping "Company Name" -> "Domain/Logo"
        const response = await fetch(
            `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(clientName)}`,
            {
                method: "GET",
                headers: { "Accept": "application/json" }
            }
        );

        if (!response.ok) {
            console.warn(`Brand Discovery: Clearbit API returned ${response.status}`);
            return null;
        }

        const suggestions: ClearbitSuggestion[] = await response.json();

        if (suggestions && suggestions.length > 0) {
            // We take the first result as the most likely match
            const bestMatch = suggestions[0];
            console.log(`Brand Discovery: Found logo for "${clientName}" -> ${bestMatch.logo}`);
            return bestMatch.logo;
        }

        return null;
    } catch (error) {
        console.error("Brand Discovery Error:", error);
        return null;
    }
}
