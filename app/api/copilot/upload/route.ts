import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { uploadDocument, addToWorkspace, updatePin } from "@/lib/anything-llm";

/**
 * POST /api/copilot/upload
 *
 * Bicameral RAG Upload — "Upload once, Sync twice"
 *
 * 1. Uploads the file to AnythingLLM
 * 2. Embeds into the PROJECT workspace (for project-specific RAG)
 * 3. PINS the doc in the project workspace (full context window access)
 * 4. Embeds into dashboard-vault (for cross-project semantic search)
 *    — NOT pinned in vault (saves tokens, relies on vector search)
 *
 * Body: multipart/form-data
 *   - file: the document (PDF, DOCX, TXT, MD)
 *   - projectId: the proposal ID
 *   - pin: "true" to pin in project workspace (default: true)
 *   - crossSync: "true" to also embed in dashboard-vault (default: true)
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const projectId = formData.get("projectId") as string | null;
        const pinParam = formData.get("pin") as string | null;
        const crossSyncParam = formData.get("crossSync") as string | null;

        const shouldPin = pinParam !== "false"; // default true
        const shouldCrossSync = crossSyncParam !== "false"; // default true

        if (!file) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }
        if (!projectId) {
            return NextResponse.json({ error: "projectId is required" }, { status: 400 });
        }
        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({ error: "AnythingLLM not configured" }, { status: 500 });
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
            return NextResponse.json({ error: "No AI workspace for this project" }, { status: 404 });
        }

        console.log(`[Copilot/Upload] File "${file.name}" (${(file.size / 1024).toFixed(1)}KB) → workspace "${workspaceSlug}"`);

        // Step 1: Upload the file to AnythingLLM
        // Use addToWorkspaces to embed in project workspace immediately
        const workspaces = shouldCrossSync
            ? [workspaceSlug, "dashboard-vault"]
            : [workspaceSlug];

        const uploadResult = await uploadDocument(file, file.name, {
            addToWorkspaces: workspaces,
        });

        if (!uploadResult.success) {
            console.error("[Copilot/Upload] Upload failed:", uploadResult.message);
            return NextResponse.json({
                error: "Upload failed",
                details: uploadResult.message,
            }, { status: 500 });
        }

        // Extract the document path from the upload response
        const docPath =
            uploadResult.data?.documents?.[0]?.location ||
            uploadResult.data?.document?.location ||
            uploadResult.data?.document?.path ||
            uploadResult.data?.path ||
            null;

        console.log(`[Copilot/Upload] Uploaded successfully. docPath: ${docPath}`);

        // Step 2: If we got a docPath and pinning is enabled, pin in project workspace
        let pinResult = null;
        if (shouldPin && docPath) {
            pinResult = await updatePin(workspaceSlug, docPath, true);
            console.log(`[Copilot/Upload] Pin result: ${pinResult.success ? "OK" : "FAILED"}`);
        }

        // Step 3: If addToWorkspaces didn't auto-embed, manually trigger embedding
        // (Some AnythingLLM versions need explicit update-embeddings)
        if (docPath) {
            await addToWorkspace(workspaceSlug, docPath).catch((e) =>
                console.warn("[Copilot/Upload] Embedding update (project) warning:", e.message)
            );

            if (shouldCrossSync) {
                addToWorkspace("dashboard-vault", docPath).catch((e) =>
                    console.warn("[Copilot/Upload] Embedding update (vault) warning:", e.message)
                );
            }
        }

        return NextResponse.json({
            success: true,
            file: file.name,
            size: file.size,
            workspace: workspaceSlug,
            docPath,
            pinned: shouldPin && !!docPath,
            crossSynced: shouldCrossSync,
        });
    } catch (error: any) {
        console.error("[Copilot/Upload] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
