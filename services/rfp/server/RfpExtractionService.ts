import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { ProposalType } from "@/types";

/**
 * RfpExtractionService
 * Bridges AnythingLLM intelligence with the Natalia form state.
 * Extracts technical specs, naming, and Ferrari logic from raw RFP text.
 */
export class RfpExtractionService {
    /**
     * extractFromWorkspace
     * Asks AnythingLLM to analyze documents in the workspace and return structured proposal data.
     */
    static async extractFromWorkspace(workspaceSlug: string): Promise<any> {
        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            throw new Error("AnythingLLM not configured");
        }

        const prompt = `
      You are the ANC Digital Signage Expert AI. 
      Analyze the RFP document(s) in this workspace and extract a complete set of technical specifications and project metadata.
      
      CRITICAL FOCUS (Division 11): 
      You MUST prioritize and search for "SECTION 11 63 10" (LED Display Systems) and "SECTION 11 06 60" (Display Schedule).
      These sections are the "Master Truth". Data found here overrides all other sections.
      
      SPECIFIC EXTRACTION TARGETS:
      1. LOCATE the "LED Display Schedule" table in Section 11 06 60.
      2. EXTRACT the following rows for each display type:
         - "Quantity" or "Qty"
         - "Active Area" or "Dimensions" (Width x Height)
         - "Pixel Pitch" (e.g., 4mm, 6mm, 10mm)
         - "Resolution" (if Dimensions are missing)
      3. IF "Section 11 06 60" is found, set "extractionAccuracy" to "High".

      CRITICAL: You must detect specific ANC "Ferrari Level" site rules:
      1. UNION LABOR: Does the RFP require IBEW/Union Labor? (Search for "Labor", "Union", "Collective Bargaining")
      2. WTC LOCATION: Is this project at the World Trade Center (Complexity level 10)?
      3. SPARE PARTS: Is there a "Minimum 5% Spare Parts" requirement? (Mapped to includeSpareParts)
      4. REPLACEMENT: Is this a replacement project? (Mapped to isReplacement)
      5. HDR/BRIGHTNESS: Extract required Nits (brightness) and HDR support from Section 11 63 10.
      6. STRUCTURAL (Thornton Tomasetti): Does the RFP include a structural report from "Thornton Tomasetti" or "TTE"? 
         If so, extract the Tonnage estimates:
         - Search for "reinforcing steel" tonnage (e.g., 17 tons).
         - Search for "new steel columns/beams" tonnage (e.g., 17 tons).
         - Map these to metadata fields structuralTonnage and reinforcingTonnage.
      
      OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown, no conversational text.
      
      {
        "clientName": "...",
        "projectTitle": "...",
        "venue": "Milan Puskar Stadium" | "WVU Coliseum" | "Generic",
        "extractionAccuracy": "High" | "Standard",
        "screens": [ ... ],
        "rulesDetected": {
           "requiresUnionLabor": boolean,
           "isWtcLocation": boolean,
           "requiresSpareParts": boolean,
           "requiresBond": boolean,
           "structuralTonnage": number,
           "reinforcingTonnage": number
        }
      }
    `;

        try {
            const response = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
                },
                body: JSON.stringify({
                    message: prompt,
                    mode: "chat",
                }),
            });

            if (!response.ok) throw new Error(`AnythingLLM API Error: ${response.statusText}`);

            const data = await response.json();
            const rawContent = data.textResponse || ""; // AnythingLLM returns textResponse in chat mode

            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("No valid JSON found in AI response: " + rawContent);

            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error("RfpExtractionService error:", error);
            throw error;
        }
    }
}
