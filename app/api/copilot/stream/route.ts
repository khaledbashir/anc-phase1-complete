import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

/**
 * POST /api/copilot/stream
 *
 * Streaming chat via AnythingLLM's stream-chat endpoint.
 * Returns Server-Sent Events (SSE) for real-time text generation.
 * Uses thread-scoped endpoint when aiThreadId exists.
 *
 * Body: { projectId: string, message: string, useAgent?: boolean }
 */
export async function POST(req: NextRequest) {
    try {
        const { projectId, message, useAgent } = await req.json();

        if (!message || !projectId) {
            return new Response(
                JSON.stringify({ error: "projectId and message are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!ANYTHING_LLM_BASE_URL || !ANYTHING_LLM_KEY) {
            return new Response(
                JSON.stringify({ error: "AnythingLLM not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Look up workspace slug + thread
        const proposal = await prisma.proposal.findUnique({
            where: { id: projectId },
            select: {
                aiWorkspaceSlug: true,
                aiThreadId: true,
                workspace: { select: { aiWorkspaceSlug: true } },
            },
        });

        const workspaceSlug =
            proposal?.aiWorkspaceSlug ||
            proposal?.workspace?.aiWorkspaceSlug ||
            null;
        const threadSlug = proposal?.aiThreadId || null;

        if (!workspaceSlug) {
            return new Response(
                JSON.stringify({ error: "No AI workspace for this project" }),
                { status: 404, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build stream-chat URL — thread-scoped when available
        const streamPath = threadSlug
            ? `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/thread/${threadSlug}/stream-chat`
            : `${ANYTHING_LLM_BASE_URL}/workspace/${workspaceSlug}/stream-chat`;

        console.log(`[Copilot/Stream] Project ${projectId} → ${streamPath}`);

        // Call AnythingLLM stream-chat
        const upstreamRes = await fetch(streamPath, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${ANYTHING_LLM_KEY}`,
            },
            body: JSON.stringify({
                message: useAgent ? `@agent ${message}` : message,
                mode: "chat",
                sessionId: `copilot-${projectId}`,
            }),
        });

        if (!upstreamRes.ok) {
            const errorText = await upstreamRes.text();
            console.error(`[Copilot/Stream] AnythingLLM error (${upstreamRes.status}):`, errorText);
            return new Response(
                JSON.stringify({ error: "AI workspace error", details: errorText }),
                { status: upstreamRes.status, headers: { "Content-Type": "application/json" } }
            );
        }

        // Pipe the SSE stream from AnythingLLM to the client
        // Transform: strip <think> tags, forward textResponse chunks
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
                        if (done) {
                            console.log(`[Copilot/Stream] Stream ended. Total chunks forwarded: ${chunkCount}`);
                            break;
                        }

                        const rawText = decoder.decode(value, { stream: true });
                        buffer += rawText;

                        // Log first chunk for debugging
                        if (chunkCount === 0) {
                            console.log(`[Copilot/Stream] First raw chunk: ${rawText.slice(0, 200)}`);
                        }

                        // Process complete lines from the buffer
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || ""; // Keep incomplete line in buffer

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;

                            // AnythingLLM sends JSON lines or SSE data: lines
                            let jsonStr = trimmed;
                            if (trimmed.startsWith("data: ")) {
                                jsonStr = trimmed.slice(6);
                            }

                            try {
                                const chunk = JSON.parse(jsonStr);

                                // Pass raw chunks to client — including <think> tags
                                // Client-side state machine handles thinking UI
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
                                );
                                chunkCount++;

                                if (chunk.close) {
                                    console.log(`[Copilot/Stream] Close chunk received after ${chunkCount} chunks`);
                                    break;
                                }
                            } catch {
                                // Not valid JSON — could be SSE comment or partial data
                                if (chunkCount === 0) {
                                    console.log(`[Copilot/Stream] Non-JSON line: ${trimmed.slice(0, 100)}`);
                                }
                            }
                        }
                    }

                    // If we got zero chunks, send a diagnostic message
                    if (chunkCount === 0) {
                        console.error("[Copilot/Stream] No chunks parsed from upstream. Buffer remainder:", buffer.slice(0, 500));
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                type: "textResponseChunk",
                                textResponse: "The AI is thinking but the response format was unexpected. Try again or switch to non-streaming mode.",
                                close: true,
                                error: null,
                                sources: [],
                            })}\n\n`)
                        );
                    }
                } catch (err) {
                    console.error("[Copilot/Stream] Stream error:", err);
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "error", textResponse: "Stream interrupted", close: true })}\n\n`)
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
        console.error("[Copilot/Stream] Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
