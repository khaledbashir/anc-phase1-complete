import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proposalId, questionId, answer } = body;

    if (!proposalId || !questionId || answer === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify proposal and question exist
    const question = await prisma.rfpQuestion.findUnique({
      where: { id: questionId },
      include: { proposal: { include: { workspace: true } } },
    });

    if (!question || question.proposalId !== proposalId) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    // Update the answer
    const updatedQuestion = await prisma.rfpQuestion.update({
      where: { id: questionId },
      data: {
        answer,
        answered: true,
      },
    });

    // Update proposal clientSummary with this answer
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      select: { clientSummary: true },
    });

    const currentSummary = (proposal?.clientSummary as any) || {};
    const updatedSummary = {
      ...currentSummary,
      [`question_${question.order}`]: {
        question: question.question,
        answer,
      },
    };

    await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        clientSummary: updatedSummary as any,
      },
    });

    // Check if all questions are answered
    const allQuestions = await prisma.rfpQuestion.findMany({
      where: { proposalId },
    });

    const answeredQuestions = allQuestions.filter((q) => q.answered);
    const remainingQuestions = allQuestions.filter((q) => !q.answered);

    // Calculate progress
    const progress = Math.round((answeredQuestions.length / allQuestions.length) * 100);

    return NextResponse.json({
      ok: true,
      question: updatedQuestion,
      progress,
      totalQuestions: allQuestions.length,
      answeredQuestions: answeredQuestions.length,
      remainingQuestions,
      previewWillBePages: Math.ceil(answeredQuestions.length / 3) + 1, // ~3 questions per page
    });
  } catch (error: any) {
    console.error("RFP answer error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
