import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const proposalId = params.id;

    // Get all questions
    const allQuestions = await prisma.rfpQuestion.findMany({
      where: { proposalId },
      orderBy: { order: "asc" },
    });

    // Separate answered vs unanswered
    const answeredQuestions = allQuestions.filter((q) => q.answered);
    const unansweredQuestions = allQuestions.filter((q) => !q.answered);

    // Smart filtering: Return different data based on what frontend needs
    const showUnansweredOnly = request.nextUrl.searchParams.get("unanswered") === "true";

    return NextResponse.json({
      ok: true,
      allQuestions,
      answeredQuestions,
      unansweredQuestions,
      displayQuestions: showUnansweredOnly ? unansweredQuestions : allQuestions,
      progress: Math.round((answeredQuestions.length / allQuestions.length) * 100) || 0,
      totalQuestions: allQuestions.length,
      answeredCount: answeredQuestions.length,
      remainingCount: unansweredQuestions.length,
    });
  } catch (error: any) {
    console.error("Get questions error:", error);
    return NextResponse.json({ error: error?.message || String(error) }, { status: 500 });
  }
}
