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
      
      MANDATORY CITATION REQUIREMENT (Trust but Verify):
      For EVERY extracted value, you MUST include a citation in this EXACT format:
      "[Source: Section X.XX, Page Y]"
      
      Example: "pixelPitch": { "value": 10, "citation": "[Source: Section 11 06 60, Page 9]" }
      
      If no specific page/section is found, use: "[Source: Document Analysis]"
      
      SPECIFIC EXTRACTION TARGETS:
      1. LOCATE the "LED Display Schedule" table in Section 11 06 60.
      2. EXTRACT the following rows for each display type WITH CITATIONS:
         - "Quantity" or "Qty" + citation
         - "Active Area" or "Dimensions" (Width x Height) + citation
         - "Pixel Pitch" (e.g., 4mm, 6mm, 10mm) + citation
         - "Resolution" (if Dimensions are missing) + citation
         - "Brightness" (cd/m² rating) + citation
      3. IF "Section 11 06 60" is found, set "extractionAccuracy" to "High".

      CRITICAL: You must detect specific ANC "Ferrari Level" site rules:
      1. UNION LABOR: Does the RFP require IBEW/Union Labor? (Search for "Labor", "Union", "Collective Bargaining")
      2. WTC LOCATION: Is this project at the World Trade Center (Complexity level 10)?
      3. SPARE PARTS: Is there a "Minimum 5% Spare Parts" requirement? (Mapped to includeSpareParts)
      4. REPLACEMENT: Is this a replacement project? (Mapped to isReplacement)
      5. HDR/BRIGHTNESS: Extract required Brightness rating and HDR support from Section 11 63 10.
      6. STRUCTURAL (Thornton Tomasetti): Does the RFP include a structural report from "Thornton Tomasetti" or "TTE"? 
         If so, extract the Tonnage estimates:
         - Search for "reinforcing steel" tonnage (e.g., 17 tons).
         - Search for "new steel columns/beams" tonnage (e.g., 17 tons).
         - Map these to metadata fields structuralTonnage and reinforcingTonnage.
      
      OUTPUT FORMAT: Return ONLY a valid JSON object. No markdown, no conversational text.
      
      {
        "clientName": { "value": "...", "citation": "[Source: ...]" },
        "projectTitle": { "value": "...", "citation": "[Source: ...]" },
        "venue": "Milan Puskar Stadium" | "WVU Coliseum" | "Generic",
        "extractionAccuracy": "High" | "Standard",
        "screens": [
          {
            "name": { "value": "...", "citation": "[Source: Section 11 06 60, Page X]" },
            "pixelPitch": { "value": 10, "citation": "[Source: Section 11 06 60, Page X]" },
            "width": { "value": 40, "citation": "[Source: Section 11 06 60, Page X]" },
            "height": { "value": 20, "citation": "[Source: Section 11 06 60, Page X]" },
            "brightness": { "value": 6000, "citation": "[Source: Section 11 63 10, Page X]" }
          }
        ],
        "rulesDetected": {
           "requiresUnionLabor": { "value": true, "citation": "[Source: Section X, Page Y]" },
           "isWtcLocation": boolean,
           "requiresSpareParts": { "value": true, "citation": "[Source: Exhibit A, Page 11]" },
           "requiresBond": boolean,
           "structuralTonnage": { "value": 17, "citation": "[Source: TTE Report, Page X]" },
           "reinforcingTonnage": { "value": 17, "citation": "[Source: TTE Report, Page X]" }
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
