import { queryVault } from "@/lib/anything-llm";
import { extractJson } from "@/lib/json-utils";

export interface CompetitorSignal {
    signal: string;
    competitor: string;
    implication: string;
    counterArgument: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface CompetitorAnalysisResult {
    primaryCompetitor?: string;
    riskLevel: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
    signals: CompetitorSignal[];
    executiveSummary: string;
}

const COMPETITOR_ANALYSIS_PROMPT = `
You are the "Competitor Radar", a forensic sales engineer for ANC Sports. 
Your job is to analyze RFP technical specifications and detect if they are "wired" for a specific competitor.

competitor_profiles = {
    "Daktronics": {
        "signals": ["120V power", "DVX", "Show Control", "V-Link", "ProRail", "10,000 nits (legacy)"],
        "weakness": "Legacy 120V power is inefficient (high amperage loops). Proprietary closed ecosystem."
    },
    "Samsung": {
        "signals": ["Prismview", "XPR", "Picture Quality/Processing priority", "8K references"],
        "weakness": "Commodity hardware, often lower nit brightness real-world."
    },
    "Absen": {
        "signals": ["Acclaim", "A27", "N Series", "Standard cabinet sizes (500x500mm hard requirement)"],
        "weakness": "Lower structural integrity, often requires more steel."
    },
    "Watchfire": {
        "signals": ["S-Series", "F-Series", "10mm (Virtual)"],
        "weakness": "Heavier cabinets, often higher power consumption."
    }
}

INSTRUCTIONS:
1. Scan the provided RFP text for specific technical "tells" (voltage, weight, product names, distinct pixel pitches).
2. If a signal determines a specific competitor, Flag it.
3. Generate a "Counter-Argument" script for the sales rep to use.

OUTPUT FORMAT (JSON ONLY):
{
    "primaryCompetitor": "Name or null",
    "riskLevel": "CRITICAL" (if wired specs found) | "HIGH" | "MODERATE" | "LOW",
    "signals": [
        {
            "signal": "Found '120V power' requirement",
            "competitor": "Daktronics",
            "implication": "Client looks set up for legacy Daktronics infrastructure.",
            "counterArgument": "Highlight ANC's 240V efficiency: '120V loops require 2x the copper and breakers. Our 240V system saves 30% on electrical install.'",
            "confidence": "HIGH"
        }
    ],
    "executiveSummary": "1-2 sentence forensic summary of who likely wrote this RFP."
}
`;

export async function analyzeCompetitorSignals(rfpText: string, workspaceSlug: string = "researcher"): Promise<CompetitorAnalysisResult> {
    try {
        console.log("[Competitor Radar] Scanning RFP for signals...");

        // Append the RFP text to the prompt
        const fullPrompt = `${COMPETITOR_ANALYSIS_PROMPT}\n\n=== RFP TEXT TO ANALYZE ===\n${rfpText.substring(0, 15000)}`; // Truncate to avoid context limits if huge

        const aiResponse = await queryVault(workspaceSlug, fullPrompt, "chat");
        const jsonText = extractJson(aiResponse);

        if (!jsonText) {
            throw new Error("Failed to extract JSON from AI response");
        }

        return JSON.parse(jsonText);

    } catch (error) {
        console.error("[Competitor Radar] Analysis Failed:", error);
        return {
            riskLevel: "LOW",
            signals: [],
            executiveSummary: "Analysis unavailable due to processing error."
        };
    }
}
