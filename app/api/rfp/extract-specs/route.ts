import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { processPdf } from "@/services/rfp/pdfProcessor";
import {
  extractSpecForms,
  extractSpecFormsWithAI,
  type ExtractedSpecForm,
} from "@/services/rfp/specFormExtractor";

function averageConfidence(specs: ExtractedSpecForm[]): number {
  if (specs.length === 0) return 0;
  const total = specs.reduce((sum, spec) => sum + spec.confidence, 0);
  return Math.round((total / specs.length) * 100) / 100;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ success: false, error: "Only PDF files are supported" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processPdf(buffer, file.name);

    const specSections = processed.sections.filter((section) => {
      const isCategoryMatch = section.category === "DISPLAY_SPECS" || section.category === "REQUIREMENTS";
      return isCategoryMatch && section.relevanceScore >= 5;
    });

    const sectionText = specSections
      .map((section) => {
        return `--- ${section.heading} (Page ${section.pageStart}, Score ${section.relevanceScore}) ---\n${section.text}`;
      })
      .join("\n\n");

    const regexSpecs = extractSpecForms(sectionText || processed.highValueText || "");
    const regexAvgConfidence = averageConfidence(regexSpecs);

    let specs = regexSpecs;
    let method: "regex" | "ai-assisted" = "regex";

    if (regexAvgConfidence < 0.7) {
      const aiSpecs = await extractSpecFormsWithAI(sectionText || processed.highValueText || "");
      if (aiSpecs.length > 0) {
        specs = aiSpecs;
      }
      method = "ai-assisted";
    }

    return NextResponse.json({
      success: true,
      specs,
      method,
      stats: {
        fileName: file.name,
        totalSections: processed.sections.length,
        candidateSections: specSections.length,
        regexCount: regexSpecs.length,
        finalCount: specs.length,
        regexAverageConfidence: regexAvgConfidence,
        finalAverageConfidence: averageConfidence(specs),
      },
    });
  } catch (error: unknown) {
    Sentry.captureException(error, { tags: { area: "rfp-extract-specs" } });
    const message = error instanceof Error ? error.message : "Failed to extract specification forms";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
