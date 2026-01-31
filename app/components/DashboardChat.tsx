"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";

type Message = {
    role: "user" | "ai";
    content: string;
    timestamp: Date;
};

const QUICK_PROMPTS = [
    { label: "Active Projects", prompt: "List all active projects and their current status" },
    { label: "Revenue Summary", prompt: "What's the total estimated revenue across all proposals?" },
    { label: "Pending Items", prompt: "Which projects have pending issues or gaps?" },
];

/**
 * DashboardChat - Business-wide AI Chat
 * Connected to the master "dashboard-vault" workspace
 * Has context of ALL project documents (cross-synced)
 */
const DashboardChat = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const MASTER_WORKSPACE = process.env.NEXT_PUBLIC_ANYTHING_LLM_MASTER_WORKSPACE || "dashboard-vault";

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async (msg?: string) => {
        const messageText = msg || input;
        if (!messageText.trim()) return;

        const userMessage: Message = {
            role: "user",
            content: messageText,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const res = await fetch("/api/dashboard/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: messageText,
                    workspace: MASTER_WORKSPACE,
                }),
            });

            const data = await res.json();

            const aiMessage: Message = {
                role: "ai",
                content: data.response || "Sorry, I couldn't process that request.",
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, aiMessage]);
        } catch (error) {
            console.error("Dashboard chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: "Connection error. Please try again.",
                    timestamp: new Date(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-lg transition-all duration-300",
                    "bg-gradient-to-r from-[#0A52EF] to-purple-600 text-white",
                    "hover:shadow-xl hover:scale-105",
                    isOpen && "scale-95 bg-zinc-800"
                )}
            >
                <div className="relative">
                    <Building2 className="w-6 h-6" />
                    <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300 animate-pulse" />
                </div>
            </button>

            {/* Chat panel */}
            <div className={cn(
                "fixed bottom-24 right-6 z-40 w-96 transition-all duration-300 transform",
                isOpen ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
            )}>
                <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#0A52EF] to-purple-600 p-4 text-white">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold">ANC Business Intelligence</h3>
                                <p className="text-xs opacity-80">Ask about any project</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div
                        ref={scrollRef}
                        className="h-80 overflow-y-auto p-4 space-y-3 bg-zinc-50"
                    >
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center mb-3">
                                    <MessageSquare className="w-6 h-6 text-[#0A52EF]" />
                                </div>
                                <p className="text-sm text-zinc-600 font-medium">Business-Wide Context</p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    I have access to all your projects.<br />
                                    Ask me anything about your business.
                                </p>
                            </div>
                        )}

                        {messages.map((m, i) => (
                            <div
                                key={i}
                                className={cn(
                                    "flex flex-col max-w-[85%]",
                                    m.role === "user" ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                <div className={cn(
                                    "px-3 py-2 rounded-2xl text-sm",
                                    m.role === "user"
                                        ? "bg-[#0A52EF] text-white rounded-tr-none"
                                        : "bg-white border border-zinc-200 text-zinc-700 rounded-tl-none shadow-sm"
                                )}>
                                    {m.content}
                                </div>
                                <span className="text-[10px] text-zinc-400 mt-1 px-1">
                                    {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex items-center gap-2">
                                <div className="bg-white border border-zinc-200 px-3 py-2 rounded-2xl rounded-tl-none shadow-sm">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#0A52EF]" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick prompts */}
                    <div className="p-3 border-t border-zinc-100 bg-white">
                        <div className="flex flex-wrap gap-1.5 mb-3">
                            {QUICK_PROMPTS.map((qp, i) => (
                                <button
                                    key={i}
                                    onClick={() => sendMessage(qp.prompt)}
                                    disabled={isLoading}
                                    className="text-[10px] bg-zinc-100 px-2 py-1 rounded-full hover:bg-[#0A52EF]/10 hover:text-[#0A52EF] transition-colors disabled:opacity-50"
                                >
                                    {qp.label}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                placeholder="Ask about your business..."
                                className="w-full bg-zinc-100 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A52EF]"
                            />
                            <button
                                onClick={() => sendMessage()}
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-2 p-1.5 text-[#0A52EF] hover:bg-[#0A52EF]/10 rounded-lg transition-all disabled:opacity-30"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DashboardChat;
