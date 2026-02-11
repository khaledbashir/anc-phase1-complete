import { NextRequest, NextResponse } from "next/server";
import { buildVisionPrompt, type VisionBatchRequest, type DrawingAnalysisResult } from "@/app/tools/pdf-filter/lib/pdf-vision";
import { VISION_CATEGORY_LABELS } from "@/app/tools/pdf-filter/lib/drawing-categories";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

function getAnthropicKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return key;
}

export async function POST(request: NextRequest) {
  let body: VisionBatchRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.images || !Array.isArray(body.images) || body.images.length === 0) {
    return NextResponse.json({ error: "No images provided" }, { status: 400 });
  }

  if (body.images.length > 20) {
    return NextResponse.json({ error: "Maximum 20 images per batch" }, { status: 400 });
  }

  let apiKey: string;
  try {
    apiKey = getAnthropicKey();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Missing API key" },
      { status: 500 }
    );
  }

  const systemPrompt = buildVisionPrompt(
    body.enabledCategories || [],
    body.customInstructions || ""
  );

  const imageContent = body.images.map((img, idx) => ([
    {
      type: "text" as const,
      text: `Image ${idx} (Page ${img.pageNumber}):`,
    },
    {
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: "image/png" as const,
        data: img.base64.replace(/^data:image\/\w+;base64,/, ""),
      },
    },
  ])).flat();

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              ...imageContent,
              {
                type: "text",
                text: `Analyze these ${body.images.length} drawing(s). Return a JSON array with one object per image.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Anthropic API error:", response.status, errorBody);
      return NextResponse.json(
        { error: `Anthropic API error (${response.status}): ${errorBody}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const textContent = data.content?.find((c: any) => c.type === "text")?.text || "[]";

    let parsed: any[];
    try {
      const jsonMatch = textContent.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("Failed to parse vision response:", textContent);
      return NextResponse.json(
        { error: `Failed to parse model response: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` },
        { status: 502 }
      );
    }

    const results: DrawingAnalysisResult[] = parsed.map((item: any) => {
      const imageIdx = typeof item.image_index === "number" ? item.image_index : 0;
      const sourceImage = body.images[imageIdx] || body.images[0];
      const category = String(item.category || "other");
      return {
        pageIndex: sourceImage.pageIndex,
        pageNumber: sourceImage.pageNumber,
        category,
        categoryLabel: VISION_CATEGORY_LABELS[category] || category,
        description: String(item.description || "No description"),
        confidence: Math.max(0, Math.min(100, Number(item.confidence) || 0)),
      };
    });

    return NextResponse.json({ results });
  } catch (err) {
    console.error("Vision analysis error:", err);
    return NextResponse.json(
      { error: `Vision analysis failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}
