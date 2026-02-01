import { NextRequest, NextResponse } from "next/server";
import { sowGenerator, SOWProjectContext } from "@/services/sow/sowGenerator";

/**
 * POST /api/sow/generate
 * 
 * REQ-123: Bespoke SOW Generation
 * Generates a Statement of Work using the hybrid Template + AI approach.
 * 
 * Request Body:
 * {
 *   context: SOWProjectContext,
 *   useAI?: boolean,          // Default true - set false for template-only
 *   workspaceSlug?: string    // AnythingLLM workspace for RAG context
 * }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { context, useAI = true, workspaceSlug } = body as {
            context: SOWProjectContext;
            useAI?: boolean;
            workspaceSlug?: string;
        };
        
        if (!context || !context.venue || !context.clientName) {
            return NextResponse.json(
                { error: "Missing required fields: venue and clientName" },
                { status: 400 }
            );
        }
        
        // Ensure displays array exists
        if (!context.displays) {
            context.displays = [];
        }
        
        let result;
        
        if (useAI) {
            // Full hybrid generation with AI
            result = await sowGenerator.generateSOW(context, workspaceSlug);
        } else {
            // Template-only fallback (no LLM calls)
            result = sowGenerator.generateTemplateOnlySOW(context);
        }
        
        return NextResponse.json({
            success: true,
            sow: result,
        });
        
    } catch (error: any) {
        console.error("[SOW Generate API] Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate SOW" },
            { status: 500 }
        );
    }
}
