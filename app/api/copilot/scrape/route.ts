import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { uploadLinkToWorkspace } from "@/lib/rag-sync";

/**
 * POST /api/copilot/scrape
 *
 * Scrapes a URL and embeds it into the project's AnythingLLM workspace.
 * Optionally cross-syncs to dashboard-vault for global search.
 *
 * Body: { projectId: string, url: string, crossSync?: boolean }
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId, url, crossSync } = await req.json();

        if (!url) {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }
        if (!projectId) {
            return NextResponse.json({ error: "projectId is required" }, { status: 400 });
        }

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({
                error: "AnythingLLM not configured",
            }, { status: 500 });
        }

        // Look up workspace slug
        const proposal = await prisma.proposal.findUnique({
            where: { id: projectId },
            select: { aiWorkspaceSlug: true, workspace: { select: { aiWorkspaceSlug: true } } },
        });

        const workspaceSlug =
            proposal?.aiWorkspaceSlug ||
            proposal?.workspace?.aiWorkspaceSlug ||
            null;

        if (!workspaceSlug) {
            return NextResponse.json({
                error: "No AI workspace for this project",
            }, { status: 404 });
        }

        console.log(`[Copilot/Scrape] Scraping "${url}" → workspace "${workspaceSlug}"`);

        // Scrape and embed into project workspace
        const result = await uploadLinkToWorkspace(workspaceSlug, url);

        // Cross-sync to dashboard-vault if requested
        if (crossSync) {
            uploadLinkToWorkspace("dashboard-vault", url).catch((e) =>
                console.error("[Copilot/Scrape] Cross-sync to dashboard-vault failed:", e)
            );
        }

        return NextResponse.json({
            success: result.ok,
            workspace: workspaceSlug,
            url,
            crossSync: !!crossSync,
            details: (result as any).body || null,
        });
    } catch (error: any) {
        console.error("[Copilot/Scrape] Error:", error);
        return NextResponse.json({
            error: error.message,
        }, { status: 500 });
    }
}
