/**
 * POST /api/estimator/ai-quick
 *
 * AI Quick Estimate — User describes a project in plain English,
 * AnythingLLM extracts structured EstimatorAnswers.
 *
 * Input:  { description: string }
 * Output: { answers: Partial<EstimatorAnswers>, displays: DisplayAnswers[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { queryVault } from "@/lib/anything-llm";

const EXTRACTION_PROMPT = `You are an LED display estimation assistant for ANC Sports Enterprises.
Extract structured project data from the user's description and return ONLY valid JSON (no markdown, no explanation).

Return this exact JSON shape:
{
  "clientName": "string or empty",
  "projectName": "string or empty",
  "location": "city, state or empty",
  "docType": "budget" | "proposal" | "loi",
  "currency": "USD" | "CAD" | "EUR" | "GBP",
  "isIndoor": true | false,
  "isNewInstall": true | false,
  "isUnion": true | false,
  "displays": [
    {
      "displayName": "e.g. Main Scoreboard",
      "displayType": "scoreboard" | "fascia" | "ribbon" | "videoboard" | "marquee" | "center-hung" | "custom",
      "locationType": "wall" | "ceiling" | "floor" | "fascia" | "freestanding" | "outdoor",
      "widthFt": number,
      "heightFt": number,
      "pixelPitch": "2.5" | "3.9" | "4" | "6" | "10" (string),
      "installComplexity": "standard" | "complex" | "major",
      "serviceType": "Front/Rear" | "front" | "rear",
      "isReplacement": true | false
    }
  ]
}

Rules:
- If the user mentions a stadium/arena name, use it as projectName
- If they mention a team/organization, use it as clientName
- Default pixelPitch to "4" if not specified
- Default isIndoor to true unless they mention outdoor
- Default isNewInstall to true unless they mention replacement/upgrade
- Default isUnion to false unless they mention union labor
- If dimensions aren't specified, estimate reasonable sizes based on the display type:
  - Scoreboard: 20x12, Center-hung: 15x10, Ribbon/fascia: 100x3, Marquee: 30x6, Videoboard: 25x14
- Extract ALL displays mentioned. If they say "two scoreboards", create 2 entries.
- If docType isn't clear, default to "budget"

User description:
`;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { description } = body;

        if (!description || typeof description !== "string" || description.trim().length < 10) {
            return NextResponse.json(
                { error: "Please provide a project description (at least 10 characters)" },
                { status: 400 }
            );
        }

        const prompt = EXTRACTION_PROMPT + description.trim();

        // Use AnythingLLM in chat mode for structured extraction
        const response = await queryVault("anc-estimator", prompt, "chat");

        if (!response || response.startsWith("Error")) {
            // Fallback: try the default workspace
            const fallbackResponse = await queryVault("default", prompt, "chat");
            if (!fallbackResponse || fallbackResponse.startsWith("Error")) {
                return NextResponse.json(
                    { error: "AI service unavailable. Please fill in the form manually." },
                    { status: 503 }
                );
            }
            return parseAndRespond(fallbackResponse);
        }

        return parseAndRespond(response);
    } catch (error) {
        console.error("[ai-quick] Error:", error);
        return NextResponse.json(
            { error: "Failed to process description" },
            { status: 500 }
        );
    }
}

function parseAndRespond(rawResponse: string) {
    try {
        // Try to extract JSON from response (might be wrapped in markdown or text)
        const jsonMatch = rawResponse.match(/\{[\s\S]*"displays"[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[ai-quick] No JSON found in response:", rawResponse.slice(0, 500));
            return NextResponse.json(
                { error: "AI couldn't extract project data. Try being more specific." },
                { status: 422 }
            );
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Validate and sanitize
        const answers: Record<string, any> = {};
        if (parsed.clientName) answers.clientName = String(parsed.clientName);
        if (parsed.projectName) answers.projectName = String(parsed.projectName);
        if (parsed.location) answers.location = String(parsed.location);
        if (["budget", "proposal", "loi"].includes(parsed.docType)) answers.docType = parsed.docType;
        if (["USD", "CAD", "EUR", "GBP"].includes(parsed.currency)) answers.currency = parsed.currency;
        if (typeof parsed.isIndoor === "boolean") answers.isIndoor = parsed.isIndoor;
        if (typeof parsed.isNewInstall === "boolean") answers.isNewInstall = parsed.isNewInstall;
        if (typeof parsed.isUnion === "boolean") answers.isUnion = parsed.isUnion;

        const displays = Array.isArray(parsed.displays)
            ? parsed.displays.map((d: any) => ({
                  displayName: String(d.displayName || "Display"),
                  displayType: String(d.displayType || "custom"),
                  locationType: String(d.locationType || "wall"),
                  widthFt: clampNumber(d.widthFt, 1, 500, 20),
                  heightFt: clampNumber(d.heightFt, 1, 200, 12),
                  pixelPitch: String(d.pixelPitch || "4"),
                  installComplexity: String(d.installComplexity || "standard"),
                  serviceType: String(d.serviceType || "Front/Rear"),
                  isReplacement: Boolean(d.isReplacement),
              }))
            : [];

        return NextResponse.json({
            answers,
            displays,
            fieldsExtracted: Object.keys(answers).length + displays.length,
        });
    } catch (parseError) {
        console.error("[ai-quick] JSON parse error:", parseError, "Raw:", rawResponse.slice(0, 500));
        return NextResponse.json(
            { error: "AI returned invalid data. Try rephrasing your description." },
            { status: 422 }
        );
    }
}

function clampNumber(val: any, min: number, max: number, fallback: number): number {
    const n = typeof val === "number" ? val : parseFloat(val);
    if (isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, n));
}
