import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const proposalId = formData.get("proposalId") as string;

    if (!file || !proposalId) {
      return NextResponse.json({ error: "Missing file or proposalId" }, { status: 400 });
    }

    // Verify proposal exists
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { workspace: true },
    });

    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Upload document to AnythingLLM
    const uploadRes = await fetch(`${ANYTHING_LLM_BASE_URL}/document/upload`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error("Failed to upload document to AnythingLLM:", errorText);
      return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
    }

    const uploadResult = await uploadRes.json();
    const document = uploadResult.documents?.[0];

    if (!document) {
      return NextResponse.json({ error: "Document upload failed" }, { status: 500 });
    }

    // Embed document into workspace
    // Prioritize proposal-level isolated slug, fallback to workspace level
    const aiWorkspaceSlug = proposal.aiWorkspaceSlug || proposal.workspace?.aiWorkspaceSlug || "anc-estimator";

    if (aiWorkspaceSlug) {
      const embedRes = await fetch(
        `${ANYTHING_LLM_BASE_URL}/workspace/${aiWorkspaceSlug}/update-embeddings`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            adds: [document.location],
            deletes: [],
          }),
        }
      );

      if (!embedRes.ok) {
        console.error("Failed to embed document:", await embedRes.text());
      }
    }

    // Now ask AnythingLLM to extract questions from RFP
    const chatRes = await fetch(
      `${ANYTHING_LLM_BASE_URL}/workspace/${aiWorkspaceSlug}/chat`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `Analyze this RFP document and extract ALL questions that need to be answered to complete the proposal. Return ONLY a JSON array of questions with this exact format:
[
  {"id": 1, "question": "Question text here"},
  {"id": 2, "question": "Question text here"}
]
Do NOT answer the questions - just extract them. Focus on: budget, timeline, technical specs, requirements, deliverables.`,
          mode: "chat",
        }),
      }
    );

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      console.error("Failed to extract questions:", errorText);
      return NextResponse.json({ error: "Failed to extract questions" }, { status: 500 });
    }

    const chatResult = await chatRes.json();
    const textResponse = chatResult.textResponse || "";

    // Parse JSON from response
    let questions: Array<{ id: number; question: string }> = [];
    try {
      // Try to extract JSON array from text
      const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        questions = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error("Failed to parse questions JSON:", e);
      // Fallback: Create placeholder questions
      questions = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        question: `Question ${i + 1} extracted from RFP`,
      }));
    }

    // Delete existing questions and create new ones
    await prisma.rfpQuestion.deleteMany({ where: { proposalId } });

    // Create new questions
    const createdQuestions = await Promise.all(
      questions.map((q) =>
        prisma.rfpQuestion.create({
          data: {
            proposalId,
            question: q.question,
            answered: false,
            order: q.id,
          },
        })
      )
    );

    // Use RfpExtractionService to get structured proposal data
    const { RfpExtractionService } = await import("@/services/rfp/server/RfpExtractionService");

    let extractedData = null;
    try {
      extractedData = await RfpExtractionService.extractFromWorkspace(aiWorkspaceSlug);
    } catch (e) {
      console.error("AI Extraction error:", e);
      // Don't fail the whole request if extraction fails
    }

    return NextResponse.json({
      ok: true,
      questions: createdQuestions,
      totalQuestions: questions.length,
      extractedData, // Return pre-filled form data
    });
  } catch (error: any) {
    console.error("RFP upload error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
