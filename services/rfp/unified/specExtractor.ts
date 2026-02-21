/**
 * LED Spec Extraction via AnythingLLM
 *
 * Takes classified pages with Mistral OCR markdown and extracts
 * structured LED display specifications using the AnythingLLM
 * workspace (Gemini-backed RAG).
 *
 * Replaces direct Gemini calls — uses existing infrastructure.
 */

import { queryVault } from "@/lib/anything-llm";
import type { AnalyzedPage, ExtractedLEDSpec, ExtractedProjectInfo } from "./types";

const WORKSPACE_SLUG = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are the ANC Digital Signage Expert AI. Extract EVERY LED display/screen requirement from the following RFP text.

PRIORITY SECTIONS (search for these):
1. "SECTION 11 06 60" — Display Schedule (MASTER TRUTH for quantities/dimensions)
2. "SECTION 11 63 10" — LED Display Systems (technical specs)
3. Any section mentioning: scoreboard, ribbon, fascia, marquee, video board, LED display

Return ONLY valid JSON (no markdown, no explanation):
{
  "project": {
    "client_name": null,
    "project_name": null,
    "venue": null,
    "location": null,
    "is_outdoor": false,
    "is_union": false,
    "bond_required": false,
    "special_requirements": []
  },
  "screens": [
    {
      "name": "Display name from RFP",
      "location": "Physical location",
      "width_ft": 40,
      "height_ft": 22,
      "width_px": null,
      "height_px": null,
      "pixel_pitch_mm": 10,
      "brightness_nits": 6000,
      "environment": "outdoor",
      "quantity": 1,
      "service_type": "rear",
      "mounting_type": "steel structure",
      "max_power_w": null,
      "weight_lbs": null,
      "special_requirements": ["weatherproof"],
      "confidence": 0.95,
      "source_pages": [9, 15],
      "notes": null
    }
  ]
}

RULES:
- Extract EVERY display, even if specs are partial
- Convert all dimensions to FEET (120" = 10ft, 3048mm = 10ft)
- If pixel pitch/brightness not specified, set to null
- Quantity defaults to 1 if not stated
- Confidence 0-1 based on how clearly specs are stated
- Include source page numbers`;

// ---------------------------------------------------------------------------
// Extract specs from relevant pages
// ---------------------------------------------------------------------------

export async function extractLEDSpecs(
  relevantPages: AnalyzedPage[],
): Promise<{
  screens: ExtractedLEDSpec[];
  project: ExtractedProjectInfo;
}> {
  if (relevantPages.length === 0) {
    return { screens: [], project: emptyProject() };
  }

  // Combine markdown from relevant pages
  const combinedText = relevantPages
    .map((p) => {
      let content = `\n--- PAGE ${p.pageNumber} (${p.category}) ---\n${p.markdown}`;
      if (p.tables.length > 0) {
        content += "\n\nTABLES:\n";
        for (const t of p.tables) {
          content += `${t.content}\n`;
        }
      }
      return content;
    })
    .join("\n");

  // Truncate if too long
  const maxChars = 80_000;
  const textToSend =
    combinedText.length > maxChars
      ? combinedText.slice(0, maxChars) + "\n\n[TRUNCATED]"
      : combinedText;

  const fullPrompt = `${EXTRACTION_PROMPT}\n\n---\nRFP CONTENT:\n${textToSend}`;

  try {
    const response = await queryVault(WORKSPACE_SLUG, fullPrompt, "chat");

    // Parse JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[SpecExtractor] No JSON in AnythingLLM response:", response.slice(0, 200));
      return { screens: [], project: emptyProject() };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const screens: ExtractedLEDSpec[] = (parsed.screens || []).map(
      (s: any): ExtractedLEDSpec => ({
        name: s.name || "Unknown Display",
        location: s.location || "",
        widthFt: s.width_ft ?? null,
        heightFt: s.height_ft ?? null,
        widthPx: s.width_px ?? null,
        heightPx: s.height_px ?? null,
        pixelPitchMm: s.pixel_pitch_mm ?? null,
        brightnessNits: s.brightness_nits ?? null,
        environment: s.environment === "outdoor" ? "outdoor" : "indoor",
        quantity: s.quantity || 1,
        serviceType: s.service_type ?? null,
        mountingType: s.mounting_type ?? null,
        maxPowerW: s.max_power_w ?? null,
        weightLbs: s.weight_lbs ?? null,
        specialRequirements: s.special_requirements || [],
        confidence: s.confidence ?? 0.5,
        sourcePages: s.source_pages || [],
        sourceType: "text",
        citation: `[Source: Pages ${(s.source_pages || []).join(", ")}]`,
        notes: s.notes ?? null,
      }),
    );

    const project: ExtractedProjectInfo = {
      clientName: parsed.project?.client_name ?? null,
      projectName: parsed.project?.project_name ?? null,
      venue: parsed.project?.venue ?? null,
      location: parsed.project?.location ?? null,
      isOutdoor: parsed.project?.is_outdoor ?? false,
      isUnionLabor: parsed.project?.is_union ?? false,
      bondRequired: parsed.project?.bond_required ?? false,
      specialRequirements: parsed.project?.special_requirements || [],
      schedulePhases: [],
    };

    return { screens, project };
  } catch (err) {
    console.error("[SpecExtractor] AnythingLLM error:", err);
    return { screens: [], project: emptyProject() };
  }
}

function emptyProject(): ExtractedProjectInfo {
  return {
    clientName: null,
    projectName: null,
    venue: null,
    location: null,
    isOutdoor: false,
    isUnionLabor: false,
    bondRequired: false,
    specialRequirements: [],
    schedulePhases: [],
  };
}
