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
import type { AnalyzedPage, ExtractedLEDSpec, ExtractedProjectInfo, ExtractedRequirement } from "./types";

const WORKSPACE_SLUG = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";

// ---------------------------------------------------------------------------
// Extraction prompt
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You are the ANC Digital Signage Expert AI. Extract EVERY LED display/screen requirement AND key project requirements from the following RFP text.

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
    "special_requirements": [],
    "schedule_phases": [
      { "phase_name": "Submission deadline", "start_date": null, "end_date": "2026-03-15", "duration": null }
    ]
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
  ],
  "requirements": [
    {
      "description": "NEMA 4X Environmental Rating required for all outdoor displays",
      "category": "compliance",
      "status": "critical",
      "date": null,
      "source_pages": [12],
      "raw_text": "All outdoor LED displays shall meet NEMA 4X rating"
    }
  ]
}

RULES:
- Extract EVERY display, even if specs are partial
- Convert all dimensions to FEET (120" = 10ft, 3048mm = 10ft)
- If pixel pitch/brightness not specified, set to null
- Quantity defaults to 1 if not stated
- Confidence 0-1 based on how clearly specs are stated
- Include source page numbers
- For requirements: category is one of: compliance, technical, deadline, financial, operational, environmental, other
- For requirements: status is one of: critical (must meet), verified (standard), risk (potential issue), info (nice to know)
- Extract deadlines, certifications, bond/insurance needs, environmental ratings, warranty terms
- Only include requirements relevant to LED displays and AV systems, not general construction`;

// ---------------------------------------------------------------------------
// Extract specs from relevant pages
// ---------------------------------------------------------------------------

export async function extractLEDSpecs(
  relevantPages: AnalyzedPage[],
): Promise<{
  screens: ExtractedLEDSpec[];
  project: ExtractedProjectInfo;
  requirements: ExtractedRequirement[];
}> {
  if (relevantPages.length === 0) {
    return { screens: [], project: emptyProject(), requirements: [] };
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
      return { screens: [], project: emptyProject(), requirements: [] };
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

    const requirements: ExtractedRequirement[] = (parsed.requirements || []).map(
      (r: any): ExtractedRequirement => ({
        description: r.description || "",
        category: r.category || "other",
        status: r.status || "info",
        date: r.date ?? null,
        sourcePages: r.source_pages || [],
        rawText: r.raw_text ?? null,
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
      schedulePhases: (parsed.project?.schedule_phases || []).map((p: any) => ({
        phaseName: p.phase_name || "",
        startDate: p.start_date ?? null,
        endDate: p.end_date ?? null,
        duration: p.duration ?? null,
      })),
    };

    return { screens, project, requirements };
  } catch (err) {
    console.error("[SpecExtractor] AnythingLLM error:", err);
    return { screens: [], project: emptyProject(), requirements: [] };
  }
}

// ---------------------------------------------------------------------------
// Batched extraction — processes pages in groups, no truncation
// ---------------------------------------------------------------------------

const BATCH_SIZE = 10;
const MAX_CHARS_PER_BATCH = 30_000;

export async function extractLEDSpecsBatched(
  relevantPages: AnalyzedPage[],
  onProgress?: (batch: number, totalBatches: number) => void,
): Promise<{
  screens: ExtractedLEDSpec[];
  project: ExtractedProjectInfo;
  requirements: ExtractedRequirement[];
}> {
  if (relevantPages.length === 0) {
    return { screens: [], project: emptyProject(), requirements: [] };
  }

  // Build batches — respect both page count and char limit
  const batches: AnalyzedPage[][] = [];
  let currentBatch: AnalyzedPage[] = [];
  let currentChars = 0;

  for (const page of relevantPages) {
    const pageChars = page.markdown.length + page.tables.reduce((s, t) => s + t.content.length, 0);

    if (currentBatch.length >= BATCH_SIZE || (currentChars + pageChars > MAX_CHARS_PER_BATCH && currentBatch.length > 0)) {
      batches.push(currentBatch);
      currentBatch = [];
      currentChars = 0;
    }

    currentBatch.push(page);
    currentChars += pageChars;
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  // Process each batch
  let allScreens: ExtractedLEDSpec[] = [];
  let allRequirements: ExtractedRequirement[] = [];
  let project: ExtractedProjectInfo = emptyProject();

  for (let i = 0; i < batches.length; i++) {
    onProgress?.(i + 1, batches.length);

    try {
      const result = await extractLEDSpecs(batches[i]);

      allScreens.push(...result.screens);
      allRequirements.push(...result.requirements);

      // Merge project info — take first non-null values
      if (!project.clientName && result.project.clientName) project = { ...project, ...result.project };
      if (result.project.clientName && !project.clientName) project.clientName = result.project.clientName;
      if (result.project.venue && !project.venue) project.venue = result.project.venue;
      if (result.project.projectName && !project.projectName) project.projectName = result.project.projectName;
      if (result.project.location && !project.location) project.location = result.project.location;
      if (result.project.isOutdoor) project.isOutdoor = true;
      if (result.project.isUnionLabor) project.isUnionLabor = true;
      if (result.project.bondRequired) project.bondRequired = true;
      project.specialRequirements = [...new Set([...project.specialRequirements, ...result.project.specialRequirements])];
      project.schedulePhases = [...project.schedulePhases, ...result.project.schedulePhases];
    } catch (err) {
      console.error(`[SpecExtractor] Batch ${i + 1}/${batches.length} failed:`, err);
      // Continue with other batches — don't fail the whole thing
    }
  }

  // Deduplicate screens by name + location
  allScreens = deduplicateScreens(allScreens);

  // Deduplicate requirements by description
  const seenReqs = new Set<string>();
  allRequirements = allRequirements.filter((r) => {
    const key = r.description.toLowerCase().trim();
    if (seenReqs.has(key)) return false;
    seenReqs.add(key);
    return true;
  });

  return { screens: allScreens, project, requirements: allRequirements };
}

function deduplicateScreens(screens: ExtractedLEDSpec[]): ExtractedLEDSpec[] {
  const seen = new Map<string, ExtractedLEDSpec>();

  for (const screen of screens) {
    const key = `${screen.name.toLowerCase().trim()}|${screen.location.toLowerCase().trim()}`;

    if (seen.has(key)) {
      // Merge: keep the one with higher confidence, merge source pages
      const existing = seen.get(key)!;
      if (screen.confidence > existing.confidence) {
        seen.set(key, {
          ...screen,
          sourcePages: [...new Set([...existing.sourcePages, ...screen.sourcePages])],
        });
      } else {
        existing.sourcePages = [...new Set([...existing.sourcePages, ...screen.sourcePages])];
      }
    } else {
      seen.set(key, screen);
    }
  }

  return Array.from(seen.values());
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
