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
Your job is to analyze RFP technical specifications and detect if they are "wired" for a specific competitor, or contain "Profit Killers" (hidden costs).

=== KNOWN COMPETITOR SIGNALS ===
DAKTRONICS (Legacy/High-Risk):
- "120V power" (Old standard, inefficient vs 240V)
- "All-Sport" scoring controller integration
- "LAMP" or "Through-Hole" or "Discrete LED" (Outdoor legacy spec, vs SMD)
- "26,000 lbs" vs "198,000 lbs" (Massive structural weight difference)
- "Thornton Tomasetti" (Structural engineering firm often used by Dak)

SAMSUNG / PRISMVIEW:
- "8K" references
- "Picture Quality" prioritized over durability
- "Blade" or "XPR" series

ABSEN:
- "500x500mm" or "609.6x342.9mm" exact cabinet dimensions
- "Acclaim" or "N-Series"

=== PROFIT KILLERS (CRITICAL ALERTS) ===
Scan for these exact phrases that destroy margin:
- "Liquidated Damages": Note amount (e.g., "$2,500/day", "$150,000/event")
- "Business and Occupation Tax" or "B&O Tax"
- "Union Labor" or "Prevailing Wage"
- "Performance & Payment Bond" (100% value)
- "Spare Parts" > 2% mandatory inventory
- "Warranty": > 2 years base, or "10 year parts availability"

INSTRUCTIONS:
1. Scan the RFP text for these "Wired Specs" and "Profit Killers".
2. If found, generate a specific COUNTER-ARGUMENT.
   - Example: Found "16mm LAMP". Counter: "LAMP is 20-year-old tech. Modern SMD is 30% brighter and 50% wider viewing angle."
   - Example: Found "$150,000 LDs". Counter: "Standard industry cap is 10% of contract. This uncapped risk is uninsurable."

OUTPUT FORMAT (JSON ONLY):
{
    "primaryCompetitor": "String (e.g. 'Daktronics') or null",
    "riskLevel": "CRITICAL" | "HIGH" | "MODERATE" | "LOW",
    "signals": [
        {
            "signal": "Found '16mm LAMP' requirement",
            "competitor": "Daktronics (Legacy)",
            "implication": "Specifies obsolete Through-Hole tech to block modern SMD bidders.",
            "counterArgument": "Propose 16mm SMD: 'LAMP technology fails at acute angles. SMD offers 160° visibility and 40% less weight.'",
            "confidence": "HIGH"
        }
    ],
    "executiveSummary": "Short forensic summary. Mention the specific 'wired' specs and the biggest financial risks (LDs, Taxes)."
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
