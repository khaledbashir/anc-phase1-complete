import { NextRequest, NextResponse } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { updateWorkspaceSettings } from "@/lib/anything-llm";

/**
 * Dashboard Chat API Route - Intelligence Core
 * Connects to the unified "dashboard-vault" workspace
 * Auto-creates workspace if it doesn't exist
 * Supports @agent mode for web search + RAG
 */
export async function POST(req: NextRequest) {
    try {
        const { message, workspace, useAgent } = await req.json();

        if (!message) {
            return NextResponse.json({ error: "Message is required" }, { status: 400 });
        }

        // Always use dashboard-vault for cross-project intelligence
        const targetWorkspace = workspace || "dashboard-vault";

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return NextResponse.json({
                error: "AnythingLLM not configured",
                response: "The Intelligence Core is offline. Please configure ANYTHING_LLM credentials."
            }, { status: 500 });
        }

        console.log(`[Intelligence Core] Querying workspace: ${targetWorkspace} (Agent: ${useAgent ? 'YES' : 'NO'})`);

        // Try to call AnythingLLM - if workspace doesn't exist, create it
        let response = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${targetWorkspace}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message: useAgent ? `@agent ${message}` : message,
                mode: "chat",
            }),
        });

        // If workspace doesn't exist, create it
        if (response.status === 404 || response.status === 400) {
            const errorText = await response.text();
            if (errorText.includes("not a valid workspace") || errorText.includes("not found")) {
                console.log(`[Intelligence Core] Workspace ${targetWorkspace} not found, creating...`);
                
                // Create the workspace
                const createRes = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/new`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
                    },
                    body: JSON.stringify({
                        name: targetWorkspace,
                        slug: targetWorkspace,
                        chatMode: "chat"
                    }),
                });

                if (createRes.ok) {
                    const created = await createRes.json();
                    const newSlug = created?.workspace?.slug || created?.slug || targetWorkspace;
                    
                    // Configure the workspace with agent capabilities
                    await updateWorkspaceSettings(newSlug, {
                        chatModel: process.env.Z_AI_MODEL_NAME || "glm-4.6v",
                        agent_provider: "openai",
                        agent_model: process.env.Z_AI_MODEL_NAME || "glm-4.6v",
                        web_search: true
                    }).catch(e => console.error("[Intelligence Core] Settings update failed:", e));

                    // Retry the chat call
                    response = await fetch(`${ANYTHING_LLM_BASE_URL}/workspace/${newSlug}/chat`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${ANYTHING_LLM_KEY}`,
                        },
                        body: JSON.stringify({
                            message: useAgent ? `@agent ${message}` : message,
                            mode: "chat",
                        }),
                    });
                } else {
                    console.error("[Intelligence Core] Failed to create workspace:", await createRes.text());
                }
            }
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error("AnythingLLM error:", errorText);
            return NextResponse.json({
                error: "Failed to get response from AI",
                response: "I'm having trouble accessing the knowledge vault. The workspace may need to be configured."
            }, { status: response.status });
        }

        const data = await response.json();

        return NextResponse.json({
            success: true,
            response: data.textResponse || data.response || "No response received.",
            sources: data.sources || [],
            thinking: data.thinking || null,
            workspace: targetWorkspace,
        });

    } catch (error: any) {
        console.error("Dashboard chat error:", error);
        return NextResponse.json({
            error: error.message,
            response: "An error occurred while processing your request. The Intelligence Core may be unreachable."
        }, { status: 500 });
    }
}
