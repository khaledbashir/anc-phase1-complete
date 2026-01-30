
/**
 * Robustly extracts a JSON object from a string that may contain:
 * - Markdown code blocks
 * - <think>...</think> blocks (DeepSeek/Reasoning models)
 * - Trailing text or noise
 * - Interleaved content
 * 
 * Strategy:
 * 1. Clean noise tags.
 * 2. Look for code blocks.
 * 3. Find first '{' and try to find the matching '}' by parsing or backtracking.
 */
export const extractJson = (text: string): string | null => {
    if (!text) return null;

    // Remove <think> blocks (DeepSeek/Reasoning models) and other potential noise
    let cleanText = text.replace(/<think>[\s\S]*?<\/think>/gi, "")
                        .replace(/<\/think>/gi, "")
                        .replace(/<think>/gi, "");

    // Try to find JSON in markdown code blocks first
    const fenced = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const candidate = (fenced?.[1] ?? cleanText).trim();
    
    const objectStart = candidate.indexOf("{");
    const arrayStart = candidate.indexOf("[");
    const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
    if (start === -1) return null;

    // Strategy: Find the valid JSON object by trying to parse from the first '{' 
    // to the last '}', then shrinking from the end if it fails.
    // This handles "JSON + garbage" and "JSON + JSON" (picking the first one).
    const endChar = candidate[start] === "[" ? "]" : "}";
    let end = candidate.lastIndexOf(endChar);
    while (end > start) {
        const potential = candidate.slice(start, end + 1);
        try {
            JSON.parse(potential);
            return potential;
        } catch (e) {
            end = candidate.lastIndexOf(endChar, end - 1);
        }
    }
    
    // If strict parsing failed, return the widest brace pair for the "repair" logic to attempt fixing
    const fallbackEnd = candidate.lastIndexOf(endChar);
    if (fallbackEnd > start) {
        return candidate.slice(start, fallbackEnd + 1);
    }
    return null;
};
