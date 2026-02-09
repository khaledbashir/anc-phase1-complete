/**
 * Kimi K2.5 Chat Service — P64
 *
 * Connects to Kimi K2.5 via Puter.js for AI copilot chat.
 * Falls back to AnythingLLM workspace chat if Puter.js is unavailable.
 */

import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatRequest {
    message: string;
    history: Array<{ role: "user" | "assistant" | "system"; content: string }>;
    context?: string; // Project context injected by contextBuilder
}

export interface ChatResponse {
    content: string;
    model: string;
    tokensUsed?: number;
}

// ============================================================================
// PUTER.JS KIMI K2.5
// ============================================================================

/**
 * Send a message to Kimi K2.5 via Puter.js.
 * Puter.js must be loaded as a script tag in the page.
 */
export async function chatWithKimi(request: ChatRequest): Promise<ChatResponse> {
    // Check if Puter.js is available (loaded via script tag)
    const puter = (globalThis as any).puter;

    if (puter?.ai?.chat) {
        try {
            const messages = [
                ...(request.context
                    ? [{ role: "system" as const, content: request.context }]
                    : []),
                ...request.history.map((m) => ({ role: m.role, content: m.content })),
                { role: "user" as const, content: request.message },
            ];

            const response = await puter.ai.chat(messages, {
                model: "moonshotai/kimi-k2.5",
            });

            return {
                content: typeof response === "string" ? response : response?.message?.content || response?.toString() || "No response",
                model: "kimi-k2.5",
            };
        } catch (err) {
            console.warn("[kimiService] Puter.js Kimi failed, falling back to AnythingLLM:", err);
        }
    }

    // Fallback: AnythingLLM workspace chat
    return chatWithAnythingLLM(request);
}

// ============================================================================
// ANYTHINGLLM FALLBACK
// ============================================================================

async function chatWithAnythingLLM(request: ChatRequest): Promise<ChatResponse> {
    const baseUrl = ANYTHING_LLM_BASE_URL;
    const apiKey = ANYTHING_LLM_KEY;

    if (!baseUrl || !apiKey) {
        return {
            content: "AI service is not configured. Please set up AnythingLLM or Puter.js.",
            model: "none",
        };
    }

    try {
        const workspace = process.env.ANYTHING_LLM_WORKSPACE || "nata-estimator";
        const res = await fetch(`${baseUrl}/workspace/${workspace}/chat`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: request.context
                    ? `[Context: ${request.context}]\n\n${request.message}`
                    : request.message,
                mode: "chat",
            }),
        });

        const data = await res.json();
        return {
            content: data?.textResponse || data?.response || "No response from AI.",
            model: "anythingllm",
        };
    } catch (err) {
        console.error("[kimiService] AnythingLLM fallback failed:", err);
        return {
            content: "AI service is temporarily unavailable. Please try again.",
            model: "error",
        };
    }
}
