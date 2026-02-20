import { NextRequest } from "next/server";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

/**
 * POST /api/chat/stream
 *
 * Standalone streaming chat via AnythingLLM's ancdashboard workspace.
 * No projectId required — this is the general-purpose AI chat.
 * Supports @agent mode for tool calls (Excel generation, etc.)
 *
 * Body: { message: string, sessionId?: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { message, sessionId } = await req.json();

        if (!message) {
            return new Response(
                JSON.stringify({ error: "message is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return new Response(
                JSON.stringify({ error: "AnythingLLM not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        const workspace = process.env.ANYTHING_LLM_WORKSPACE || "ancdashboard";
        const streamPath = `${ANYTHING_LLM_BASE_URL}/workspace/${workspace}/stream-chat`;

        console.log(`[Chat/Stream] → ${streamPath} (session: ${sessionId || "default"})`);

        const upstreamRes = await fetch(streamPath, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message,
                mode: "chat",
                sessionId: sessionId || `chat-${Date.now()}`,
            }),
        });

        if (!upstreamRes.ok) {
            const errorText = await upstreamRes.text();
            console.error(`[Chat/Stream] AnythingLLM error (${upstreamRes.status}):`, errorText);
            return new Response(
                JSON.stringify({ error: "AI error", details: errorText }),
                { status: upstreamRes.status, headers: { "Content-Type": "application/json" } }
            );
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readable = new ReadableStream({
            async start(controller) {
                const reader = upstreamRes.body?.getReader();
                if (!reader) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", textResponse: "No stream body" })}\n\n`));
                    controller.close();
                    return;
                }

                let buffer = "";
                let chunkCount = 0;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;

                            let jsonStr = trimmed;
                            if (trimmed.startsWith("data: ")) {
                                jsonStr = trimmed.slice(6);
                            }

                            try {
                                const chunk = JSON.parse(jsonStr);
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                                chunkCount++;
                                if (chunk.close) break;
                            } catch {
                                // skip non-JSON lines
                            }
                        }
                    }

                    if (chunkCount === 0) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                type: "textResponseChunk",
                                textResponse: "",
                                close: true,
                                error: "No response from AI",
                                sources: [],
                            })}\n\n`)
                        );
                    }
                } catch (err: any) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "error", textResponse: "", error: err?.message, close: true })}\n\n`)
                    );
                } finally {
                    reader.releaseLock();
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (error: any) {
        console.error("[Chat/Stream] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
