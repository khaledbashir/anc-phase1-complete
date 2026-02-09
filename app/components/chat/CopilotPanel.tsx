"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    MessageSquare,
    Send,
    X,
    Bot,
    User,
    Loader2,
    Sparkles,
    Trash2,
    ChevronDown,
    ChevronRight,
    Wand2,
    Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    ConversationStage,
    getStagePrompt,
    createInitialState,
} from "@/services/chat/proposalConversationFlow";
import type { CollectedData, StageAction } from "@/services/chat/proposalConversationFlow";
import { executeActions } from "@/services/chat/formFillBridge";
import type { FormFillContext } from "@/services/chat/formFillBridge";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    /** Reasoning/thinking content from thinking models (e.g. DeepSeek R1) */
    thinking?: string;
    /** Whether the thinking block is still streaming */
    isThinking?: boolean;
}

export type CopilotMode = "guided" | "freeform";

export interface CopilotPanelProps {
    /** Freeform chat handler — calls project's AnythingLLM workspace */
    onSendMessage?: (message: string, history: ChatMessage[]) => Promise<string>;
    /** Form context for guided mode — allows copilot to fill form fields */
    formFillContext?: FormFillContext;
    /** Project ID for guided flow API calls */
    projectId?: string;
    /** Whether this is a new empty project (triggers guided mode + auto-open) */
    isNewProject?: boolean;
    /** Whether the project already has data (Excel uploaded / Mirror Mode) */
    hasExistingData?: boolean;
    quickActions?: Array<{ label: string; prompt: string }>;
    className?: string;
    /** Callback when panel opens/closes — allows parent to adjust layout */
    onOpenChange?: (isOpen: boolean) => void;
}

/** Width of the copilot panel in pixels */
export const COPILOT_PANEL_WIDTH = 400;

// ============================================================================
// THINKING BLOCK (collapsible reasoning display)
// ============================================================================

function ThinkingBlock({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="mb-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
            >
                {isStreaming ? (
                    <Brain className="w-3 h-3 animate-pulse" style={{ color: "#8B5CF6" }} />
                ) : (
                    <Brain className="w-3 h-3" style={{ color: "#8B5CF6" }} />
                )}
                <span>{isStreaming ? "Reasoning..." : "Reasoning"}</span>
                {expanded ? (
                    <ChevronDown className="w-3 h-3" />
                ) : (
                    <ChevronRight className="w-3 h-3" />
                )}
            </button>
            {expanded && thinking && (
                <div className="mt-1.5 pl-4 border-l-2 border-purple-300 dark:border-purple-700 text-[10px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                    {thinking}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CopilotPanel({
    onSendMessage,
    formFillContext,
    projectId,
    isNewProject,
    hasExistingData,
    quickActions,
    className,
    onOpenChange,
}: CopilotPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Guided flow state
    const [mode, setMode] = useState<CopilotMode>("freeform");
    const [conversationStage, setConversationStage] = useState<ConversationStage>(ConversationStage.GREETING);
    const [collectedData, setCollectedData] = useState<CollectedData>(createInitialState().collected);
    const autoOpenedRef = useRef(false);

    // Notify parent and set body class when panel opens/closes
    useEffect(() => {
        onOpenChange?.(isOpen);
        if (isOpen) {
            document.body.classList.add("copilot-open");
        } else {
            document.body.classList.remove("copilot-open");
        }
        return () => {
            document.body.classList.remove("copilot-open");
        };
    }, [isOpen, onOpenChange]);

    // Auto-open and start guided flow for new empty projects
    useEffect(() => {
        if (isNewProject && !hasExistingData && !autoOpenedRef.current) {
            autoOpenedRef.current = true;
            setMode("guided");
            setIsOpen(true);

            // Add greeting message after a short delay
            const timer = setTimeout(() => {
                const greeting = getStagePrompt(ConversationStage.GREETING, createInitialState().collected);
                setMessages([{
                    id: `greeting-${Date.now()}`,
                    role: "assistant",
                    content: greeting,
                    timestamp: Date.now(),
                }]);
                setConversationStage(ConversationStage.CLIENT_NAME);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isNewProject, hasExistingData]);

    // If project already has data, ensure freeform mode
    useEffect(() => {
        if (hasExistingData && mode === "guided" && messages.length === 0) {
            setMode("freeform");
        }
    }, [hasExistingData, mode, messages.length]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

    // ========================================================================
    // GUIDED FLOW HANDLER
    // ========================================================================
    const handleGuidedSend = async (text: string) => {
        try {
            const res = await fetch("/api/copilot/propose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    message: text,
                    conversationStage,
                    collectedData,
                }),
            });

            const data = await res.json();

            // Execute form fill actions if we have form context
            if (data.actions && data.actions.length > 0 && formFillContext) {
                const actionLog = executeActions(formFillContext, data.actions as StageAction[]);
                console.log("[Copilot] Form actions executed:", actionLog);
            }

            // Handle PDF generation action
            if (data.actions?.some((a: any) => a.type === "generate_pdf") && formFillContext) {
                // Trigger PDF generation after a short delay to let form state settle
                setTimeout(() => {
                    const exportBtn = document.querySelector('[data-copilot-export]') as HTMLButtonElement;
                    if (exportBtn) exportBtn.click();
                }, 1000);
            }

            // Update conversation state
            if (data.nextStage) {
                setConversationStage(data.nextStage as ConversationStage);
            }
            if (data.collected) {
                setCollectedData(data.collected);
            }

            return data.reply || data.error || "No reply from AI backend.";
        } catch (err: any) {
            console.error("[Copilot] Guided flow error:", err);
            return `Error: ${err?.message || String(err)}`;
        }
    };

    // ========================================================================
    // STREAMING FREEFORM HANDLER (with thinking model support)
    // ========================================================================
    const handleStreamingSend = async (text: string, userMsg: ChatMessage) => {
        const assistantId = newId();
        const assistantMsg: ChatMessage = {
            id: assistantId,
            role: "assistant",
            content: "",
            thinking: "",
            isThinking: false,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        try {
            const res = await fetch("/api/copilot/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    message: text,
                    useAgent: text.startsWith("@agent"),
                }),
            });

            if (!res.ok || !res.body) {
                const data = await res.json().catch(() => null);
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId
                            ? { ...m, content: data?.error || "AI request failed. Try again." }
                            : m
                    )
                );
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            // State machine: NORMAL → THINKING → NORMAL
            let thinkBuf = "";
            let answerBuf = "";
            let inThink = false;

            const updateMsg = (partial: Partial<ChatMessage>) => {
                setMessages((prev) =>
                    prev.map((m) => (m.id === assistantId ? { ...m, ...partial } : m))
                );
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                let streamDone = false;
                for (const line of lines) {
                    if (streamDone) break;
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;

                    try {
                        const parsed = JSON.parse(trimmed.slice(6));

                        // Log first parsed chunk for debugging
                        if (answerBuf === "" && thinkBuf === "") {
                            console.log("[Copilot] First SSE chunk:", JSON.stringify(parsed).slice(0, 200));
                        }

                        // Check for error in chunk
                        if (parsed.error) {
                            console.error("[Copilot] Stream error from AI:", parsed.error);
                            answerBuf += `Error: ${parsed.error}`;
                            streamDone = true;
                            break;
                        }

                        // Check for close signal (final chunk — may have null textResponse)
                        if (parsed.close) {
                            console.log("[Copilot] Stream close received");
                            streamDone = true;
                            break;
                        }

                        // Skip chunks without text content
                        if (!parsed.textResponse) continue;

                        let token = parsed.textResponse as string;

                        // Process token through think-tag state machine
                        while (token.length > 0) {
                            if (!inThink) {
                                const openIdx = token.indexOf("<think>");
                                if (openIdx === -1) {
                                    answerBuf += token;
                                    token = "";
                                } else {
                                    answerBuf += token.slice(0, openIdx);
                                    token = token.slice(openIdx + 7); // skip "<think>"
                                    inThink = true;
                                    updateMsg({ isThinking: true, content: answerBuf, thinking: thinkBuf });
                                }
                            } else {
                                const closeIdx = token.indexOf("</think>");
                                if (closeIdx === -1) {
                                    thinkBuf += token;
                                    token = "";
                                } else {
                                    thinkBuf += token.slice(0, closeIdx);
                                    token = token.slice(closeIdx + 8); // skip "</think>"
                                    inThink = false;
                                    updateMsg({ isThinking: false, thinking: thinkBuf, content: answerBuf });
                                }
                            }
                        }

                        // Update UI after each token
                        updateMsg({
                            content: answerBuf,
                            thinking: thinkBuf,
                            isThinking: inThink,
                        });
                    } catch {
                        // Skip non-JSON lines
                    }
                }
                if (streamDone) break;
            }

            // Finalize — only show thinking block if real <think> tags were in the stream
            console.log(`[Copilot] Stream finalized. answerBuf: ${answerBuf.length} chars, thinkBuf: ${thinkBuf.length} chars`);
            updateMsg({
                content: answerBuf.trim() || "No response received.",
                thinking: thinkBuf || undefined,
                isThinking: false,
            });
        } catch (err: any) {
            console.error("[Copilot] Stream error:", err);
            setMessages((prev) =>
                prev.map((m) =>
                    m.id === assistantId
                        ? { ...m, content: `Stream error: ${err?.message || String(err)}`, isThinking: false }
                        : m
                )
            );
        }
    };

    // ========================================================================
    // SEND HANDLER (routes to guided or streaming freeform)
    // ========================================================================
    const handleSend = async () => {
        const text = input.trim();
        if (!text || isLoading) return;

        const userMsg: ChatMessage = {
            id: newId(),
            role: "user",
            content: text,
            timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            if (mode === "guided") {
                // Guided mode: LLM-powered via /api/copilot/propose
                const response = await handleGuidedSend(text);
                const assistantMsg: ChatMessage = {
                    id: newId(),
                    role: "assistant",
                    content: response,
                    timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
            } else if (projectId && projectId !== "new") {
                // Freeform mode with valid project: use streaming
                await handleStreamingSend(text, userMsg);
            } else if (onSendMessage) {
                // Fallback: non-streaming
                const response = await onSendMessage(text, [...messages, userMsg]);
                const assistantMsg: ChatMessage = {
                    id: newId(),
                    role: "assistant",
                    content: response,
                    timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
            } else {
                const assistantMsg: ChatMessage = {
                    id: newId(),
                    role: "assistant",
                    content: "AI backend not connected. Save the project first to enable AI chat.",
                    timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
            }
        } catch (err: any) {
            const errorMsg: ChatMessage = {
                id: newId(),
                role: "assistant",
                content: `Error: ${err?.message || String(err)}`,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const clearChat = () => {
        setMessages([]);
        if (mode === "guided") {
            setConversationStage(ConversationStage.GREETING);
            setCollectedData(createInitialState().collected);
        }
    };

    const switchToFreeform = () => {
        setMode("freeform");
        const msg: ChatMessage = {
            id: newId(),
            role: "assistant",
            content: "Switched to freeform mode. Ask me anything about this project.",
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, msg]);
    };

    const switchToGuided = () => {
        setMode("guided");
        setConversationStage(ConversationStage.GREETING);
        setCollectedData(createInitialState().collected);
        const greeting = getStagePrompt(ConversationStage.GREETING, createInitialState().collected);
        setMessages([{
            id: newId(),
            role: "assistant",
            content: greeting,
            timestamp: Date.now(),
        }]);
        setConversationStage(ConversationStage.CLIENT_NAME);
    };

    // Stage indicator for guided mode
    const stageLabels: Record<string, string> = {
        GREETING: "Getting started",
        CLIENT_NAME: "Client info",
        DISPLAYS: "Display specs",
        DISPLAY_PRICING: "Display pricing",
        SERVICES: "Services & installation",
        PM_WARRANTY: "PM & warranty",
        TAX_BOND: "Tax & bond",
        REVIEW: "Review & generate",
        GENERATE: "Generating...",
        DONE: "Complete",
    };

    return (
        <>
            {/* Toggle Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-8 right-8 z-50 flex items-center gap-2.5 px-5 py-3.5 rounded-full text-white shadow-2xl hover:scale-105 transition-all border-2 border-white/30"
                    style={{ backgroundColor: "#0A52EF" }}
                    title="Open AI Copilot"
                >
                    <MessageSquare className="w-6 h-6" />
                    <span className="text-sm font-bold tracking-wide">AI Copilot</span>
                </button>
            )}

            {/* Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-700 flex flex-col transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full",
                    className
                )}
                style={{
                    boxShadow: isOpen ? "-8px 0 30px rgba(0,0,0,0.15), -2px 0 8px rgba(0,0,0,0.08)" : "none",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(10,82,239,0.15)" }}>
                            <Sparkles className="w-4 h-4" style={{ color: "#0A52EF" }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">ANC Copilot</h3>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                {mode === "guided" ? `Guided • ${stageLabels[conversationStage] || "Building proposal"}` : "AI-powered proposal assistant"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Mode toggle */}
                        <button
                            onClick={mode === "guided" ? switchToFreeform : switchToGuided}
                            className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            title={mode === "guided" ? "Switch to freeform chat" : "Start guided proposal builder"}
                        >
                            <Wand2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={clearChat}
                            className="p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            title="Clear chat"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Guided mode progress bar */}
                {mode === "guided" && conversationStage !== ConversationStage.DONE && (
                    <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-1.5">
                            {["CLIENT_NAME", "DISPLAYS", "DISPLAY_PRICING", "SERVICES", "PM_WARRANTY", "TAX_BOND", "REVIEW"].map((s, i) => {
                                const stages = ["CLIENT_NAME", "DISPLAYS", "DISPLAY_PRICING", "SERVICES", "PM_WARRANTY", "TAX_BOND", "REVIEW"];
                                const currentIdx = stages.indexOf(conversationStage);
                                const isComplete = i < currentIdx;
                                const isCurrent = s === conversationStage;
                                return (
                                    <div
                                        key={s}
                                        className={cn(
                                            "h-1.5 flex-1 rounded-full transition-colors",
                                            isComplete ? "bg-green-500" : isCurrent ? "bg-[#0A52EF]" : "bg-zinc-200 dark:bg-zinc-700"
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white dark:bg-zinc-900">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                            <div className="p-3 rounded-2xl mb-4" style={{ backgroundColor: "rgba(10,82,239,0.1)" }}>
                                <Bot className="w-8 h-8" style={{ color: "#0A52EF" }} />
                            </div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">How can I help?</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                                {mode === "guided"
                                    ? "I'll walk you through building a proposal step by step."
                                    : "Ask me about pricing, products, proposal formatting, or anything about this project."}
                            </p>

                            {/* Quick Actions */}
                            {mode === "freeform" && (
                                <div className="w-full space-y-2">
                                    <button
                                        onClick={switchToGuided}
                                        className="w-full text-left px-3 py-2.5 text-xs rounded-xl border-2 border-[#0A52EF]/30 bg-[#0A52EF]/5 hover:bg-[#0A52EF]/10 text-zinc-700 dark:text-zinc-300 transition-all font-medium"
                                    >
                                        <Wand2 className="w-3.5 h-3.5 inline mr-2" style={{ color: "#0A52EF" }} />
                                        Start guided proposal builder
                                    </button>
                                    {quickActions && quickActions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                setInput(action.prompt);
                                                setTimeout(handleSend, 50);
                                            }}
                                            className="w-full text-left px-3 py-2.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-all"
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={cn(
                                    "flex gap-2.5",
                                    msg.role === "user" ? "justify-end" : "justify-start"
                                )}
                            >
                                {msg.role === "assistant" && (
                                    <div className="shrink-0 p-1 rounded-md h-fit mt-0.5" style={{ backgroundColor: "rgba(10,82,239,0.1)" }}>
                                        <Bot className="w-3.5 h-3.5" style={{ color: "#0A52EF" }} />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed",
                                        msg.role === "user"
                                            ? "text-white rounded-br-md"
                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md"
                                    )}
                                    style={msg.role === "user" ? { backgroundColor: "#0A52EF" } : undefined}
                                >
                                    {/* Thinking block (collapsible) */}
                                    {msg.role === "assistant" && (msg.thinking || msg.isThinking) && (
                                        <ThinkingBlock thinking={msg.thinking || ""} isStreaming={!!msg.isThinking} />
                                    )}
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                {msg.role === "user" && (
                                    <div className="shrink-0 p-1 rounded-md bg-zinc-200 dark:bg-zinc-700 h-fit mt-0.5">
                                        <User className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex gap-2.5">
                            <div className="shrink-0 p-1 rounded-md h-fit mt-0.5" style={{ backgroundColor: "rgba(10,82,239,0.1)" }}>
                                <Bot className="w-3.5 h-3.5" style={{ color: "#0A52EF" }} />
                            </div>
                            <div className="bg-zinc-100 dark:bg-zinc-800 px-3.5 py-2.5 rounded-2xl rounded-bl-md">
                                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#0A52EF" }} />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t-2 border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800/80">
                    <div className="flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={mode === "guided" ? "Type your answer..." : "Ask anything..."}
                            rows={1}
                            className="flex-1 resize-none px-3 py-2.5 text-xs text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-300 dark:border-zinc-600 rounded-xl focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/30 transition-colors max-h-[120px] overflow-y-auto placeholder:text-zinc-400"
                            style={{ minHeight: "40px" }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className={cn(
                                "p-2.5 rounded-xl transition-all",
                                input.trim() && !isLoading
                                    ? "text-white hover:opacity-90"
                                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                            )}
                            style={input.trim() && !isLoading ? { backgroundColor: "#0A52EF" } : undefined}
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1.5 text-center">
                        {mode === "guided" ? "Guided mode • Type naturally" : "Powered by ANC Copilot • Press Enter to send"}
                    </p>
                </div>
            </div>

        </>
    );
}
