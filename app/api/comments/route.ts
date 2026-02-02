import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/comments?proposalId=...
 * Fetch comments for a specific proposal
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const proposalId = searchParams.get("proposalId");

        if (!proposalId) {
            return NextResponse.json({ error: "proposalId is required" }, { status: 400 });
        }

        const comments = await prisma.comment.findMany({
            where: { proposalId },
            orderBy: { createdAt: "desc" },
            include: {
                replies: true
            }
        });

        return NextResponse.json({ comments });
    } catch (error) {
        console.error("Comments GET error:", error);
        return NextResponse.json({ error: "Failed to fetch comments" }, { status: 500 });
    }
}

/**
 * POST /api/comments
 * Add a new comment or reply
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { proposalId, content, authorName, parentCommentId, userId } = body;

        if (!proposalId || !content || !authorName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const comment = await prisma.comment.create({
            data: {
                proposalId,
                content,
                authorName,
                parentCommentId,
                userId
            }
        });

        // Log this as an activity
        await prisma.activityLog.create({
            data: {
                proposalId,
                action: "COMMENT_ADDED",
                description: `${authorName} added a comment: \"${content.substring(0, 30)}${content.length > 30 ? '...' : ''}\"`,
                userId
            }
        });

        return NextResponse.json({ comment });
    } catch (error) {
        console.error("Comments POST error:", error);
        return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
    }
}
