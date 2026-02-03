import { NextRequest, NextResponse } from "next/server";
import { queryVault } from "@/lib/anything-llm";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { extractJson } from "@/lib/json-utils";

const EXTRACTION_PROMPT = `
You are the ANC Digital Signage Expert AI. Analyze the RFP content and extract Equipment (EQ) and Quantities. Follow the 17/20 Rule: extract what you can; for the rest return null and the system will Gap Fill.

PRIORITY: Search "Section 11 63 10" (LED Display Systems) and "Section 11 06 60" (Display Schedule). That data is Master Truth.

CITATIONS (P0): Every extracted value MUST be: { "value": <actual>, "citation": "[Source: Section X, Page Y]" }. If no section/page found use "[Source: Document Analysis]". Do not hallucinate — citations prove the value is real.

MISSING FIELDS: If you cannot identify a field, set it to null. Do not guess. Null triggers Gap Fill (the Chat Sidebar will ask the user, e.g. "Section 11 did not specify Service Type. Is this Front or Rear Service?").

BRIGHTNESS: Capture the numeric value from the document (often labeled "Nits"). Store as number (e.g. 6000). The UI labels it "Brightness".

EQ FIELDS TO EXTRACT (per screen, use { value, citation } or null):
1. Screen Name  2. Quantity  3. Location/Zone  4. Application (indoor|outdoor)  5. Pixel Pitch (e.g. 10mm)
6. Resolution Height (pixels)  7. Resolution Width (pixels)  8. Active Area Height (feet/inches)  9. Active Area Width (feet/inches)
10. Brightness (number)  11. Service Type (front|rear)  12. Structural Tonnage (from Thornton Tomasetti/TTE reports, "tons")

Also extract: receiver.name, details.proposalName, details.venue; rulesDetected.structuralTonnage, reinforcingTonnage, requiresUnionLabor, requiresSpareParts.

OUTPUT: Return ONLY valid JSON. No markdown. details.screens = array of objects with the EQ fields above; each field is { value, citation } or null.
`;

export async function POST(req: NextRequest) {
  try {
    if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
      return NextResponse.json({ error: "AnythingLLM not configured" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const proposalId = body.proposalId as string | undefined;
    const workspaceSlugParam = body.workspaceSlug as string | undefined;

    let workspaceSlug = workspaceSlugParam || process.env.ANYTHING_LLM_WORKSPACE || "anc-estimator";

    if (proposalId && !workspaceSlugParam) {
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        select: { aiWorkspaceSlug: true },
      });
      if (proposal?.aiWorkspaceSlug) workspaceSlug = proposal.aiWorkspaceSlug;
    }

    console.log(`[RFP Re-extract] Running extraction on workspace: ${workspaceSlug}`);
    const aiResponse = await queryVault(workspaceSlug, EXTRACTION_PROMPT, "chat");

    const jsonText = extractJson(aiResponse);
    let extractedData: unknown = null;
    if (jsonText) {
      try {
        extractedData = JSON.parse(jsonText);
      } catch {
        try {
          extractedData = JSON.parse(jsonText + "}");
        } catch {
          // leave null
        }
      }
    }

    return NextResponse.json({
      ok: true,
      workspaceSlug,
      extractedData,
      message: "Re-extraction complete",
    });
  } catch (error: any) {
    console.error("[RFP Re-extract] Error:", error);
    return NextResponse.json({ ok: false, error: error?.message ?? "Re-extraction failed" }, { status: 500 });
  }
}
