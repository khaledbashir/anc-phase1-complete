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
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
}

export interface CopilotPanelProps {
    onSendMessage?: (message: string, history: ChatMessage[]) => Promise<string>;
    quickActions?: Array<{ label: string; prompt: string }>;
    className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CopilotPanel({ onSendMessage, quickActions, className }: CopilotPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

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
            let response: string;
            if (onSendMessage) {
                response = await onSendMessage(text, [...messages, userMsg]);
            } else {
                // Echo mode fallback
                response = `Echo: ${text}`;
            }

            const assistantMsg: ChatMessage = {
                id: newId(),
                role: "assistant",
                content: response,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        } catch (err) {
            const errorMsg: ChatMessage = {
                id: newId(),
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
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
    };

    const handleQuickAction = (prompt: string) => {
        setInput(prompt);
        // Auto-send after a tick
        setTimeout(() => {
            const fakeEvent = { key: "Enter", shiftKey: false, preventDefault: () => {} } as React.KeyboardEvent;
            handleSend();
        }, 50);
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
                    "fixed top-0 right-0 z-50 h-full w-[400px] max-w-[90vw] bg-white dark:bg-zinc-900 border-l-2 border-zinc-300 dark:border-zinc-700 shadow-2xl flex flex-col transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-0" : "translate-x-full",
                    className
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b-2 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80">
                    <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(10,82,239,0.15)" }}>
                            <Sparkles className="w-4 h-4" style={{ color: "#0A52EF" }} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">ANC Copilot</h3>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">AI-powered proposal assistant</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
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

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white dark:bg-zinc-900">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6">
                            <div className="p-3 rounded-2xl mb-4" style={{ backgroundColor: "rgba(10,82,239,0.1)" }}>
                                <Bot className="w-8 h-8" style={{ color: "#0A52EF" }} />
                            </div>
                            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">How can I help?</h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                                Ask me about pricing, products, proposal formatting, or anything about this project.
                            </p>

                            {/* Quick Actions */}
                            {quickActions && quickActions.length > 0 && (
                                <div className="w-full space-y-2">
                                    {quickActions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleQuickAction(action.prompt)}
                                            className="w-full text-left px-3 py-2.5 text-xs rounded-xl border border-border bg-card hover:bg-muted hover:border-brand-blue/30 transition-all"
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
                                    <div className="shrink-0 p-1 rounded-md bg-brand-blue/10 h-fit mt-0.5">
                                        <Bot className="w-3.5 h-3.5 text-brand-blue" />
                                    </div>
                                )}
                                <div
                                    className={cn(
                                        "max-w-[80%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed",
                                        msg.role === "user"
                                            ? "bg-brand-blue text-white rounded-br-md"
                                            : "bg-muted text-foreground rounded-bl-md"
                                    )}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                </div>
                                {msg.role === "user" && (
                                    <div className="shrink-0 p-1 rounded-md bg-muted h-fit mt-0.5">
                                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {isLoading && (
                        <div className="flex gap-2.5">
                            <div className="shrink-0 p-1 rounded-md bg-brand-blue/10 h-fit mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-brand-blue" />
                            </div>
                            <div className="bg-muted px-3.5 py-2.5 rounded-2xl rounded-bl-md">
                                <Loader2 className="w-4 h-4 text-brand-blue animate-spin" />
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
                            placeholder="Ask anything..."
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
                        Powered by ANC Copilot • Press Enter to send
                    </p>
                </div>
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
