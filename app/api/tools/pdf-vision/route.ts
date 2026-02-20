import { NextRequest, NextResponse } from "next/server";
import { buildVisionPrompt, type VisionBatchRequest, type DrawingAnalysisResult } from "@/app/tools/pdf-filter/lib/pdf-vision";
import { VISION_CATEGORY_LABELS } from "@/app/tools/pdf-filter/lib/drawing-categories";

const GEMINI_MODEL = "gemini-2.0-flash";

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return key;
}

function stripDataUri(base64: string): { mimeType: string; data: string } {
  const match = base64.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: "image/png", data: base64 };
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
    apiKey = getGeminiKey();
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

  // Build Gemini content parts: interleave text labels with inline image data
  const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  for (let idx = 0; idx < body.images.length; idx++) {
    const img = body.images[idx];
    userParts.push({ text: `Image ${idx} (Page ${img.pageNumber}):` });
    const { mimeType, data } = stripDataUri(img.base64);
    userParts.push({ inlineData: { mimeType, data } });
  }
  userParts.push({
    text: `Analyze these ${body.images.length} drawing(s). Return a JSON array with one object per image.`,
  });

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: userParts }],
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 4096,
          responseMimeType: "text/plain",
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Gemini API error:", response.status, errorBody);
      return NextResponse.json(
        { error: `Gemini API error (${response.status}): ${errorBody}` },
        { status: 502 }
      );
    }

    const data = await response.json();
    const textContent =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

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
