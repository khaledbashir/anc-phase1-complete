"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { ANYTHING_LLM_BASE_URL, ANYTHING_LLM_KEY } from "@/lib/variables";
import { BaseButton } from "@/app/components";
import { Send, Sparkles, MessageSquare, Info, History, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
    role: "user" | "ai";
    content: string;
};

const QUICK_PROMPTS = [
    { label: "Find Delivery Date", prompt: "What is the requested delivery or installation date in the RFP?" },
    { label: "Check Labor Rates", prompt: "Does the RFP specify prevailing wage or union labor rates? If so, what are they?" },
    { label: "Verify Warranties", prompt: "Extract all warranty requirements (years, coverage) from the document." },
];

const RfpSidebar = () => {
    const { aiWorkspaceSlug, aiMessages, aiLoading, executeAiCommand } = useProposalContext();
    const [input, setInput] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiMessages]);

    const handleSendMessage = async (msg?: string) => {
        const messageText = msg || input;
        if (!messageText.trim() || !aiWorkspaceSlug) return;

        setInput("");
        await executeAiCommand(messageText);
    };

    return (
        <div className="flex flex-col h-full bg-zinc-950">
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-[#0A52EF] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 fill-white animate-pulse" />
                    <h3 className="font-bold tracking-tight text-sm">ANC Intelligence Engine</h3>
                </div>
                <div className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold border border-white/30">
                    RAG-ACTIVE
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
                {aiMessages.length === 0 && (
                    <div className="text-center py-10 space-y-4">
                        <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <MessageSquare className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">ANC Document Brain</p>
                            <p className="text-xs text-zinc-500 max-w-[200px] mx-auto">Ask anything about the uploaded RFP documents or add screens directly via chat.</p>
                        </div>
                    </div>
                )}

                {aiMessages.map((m, i) => (
                    <div
                        key={i}
                        className={cn(
                            "flex flex-col max-w-[90%] space-y-1",
                            m.role === "user" ? "ml-auto items-end" : "items-start"
                        )}
                    >
                        <div className={cn(
                            "px-3 py-2 rounded-2xl text-xs leading-relaxed",
                            m.role === "user"
                                ? "bg-blue-600 text-white rounded-tr-none"
                                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-tl-none"
                        )}>
                            {m.content}
                        </div>
                    </div>
                ))}

                {aiLoading && (
                    <div className="flex items-start gap-2 max-w-[90%]">
                        <div className="bg-zinc-100 dark:bg-zinc-900 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-zinc-500 italic animate-pulse">
                            Processing document context...
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Panel */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-4 bg-zinc-50 dark:bg-zinc-900/50">
                {/* Quick Prompts */}
                <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Quick Gaps
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map((qp, i) => (
                            <button
                                key={i}
                                onClick={() => handleSendMessage(qp.prompt)}
                                disabled={aiLoading || !aiWorkspaceSlug}
                                className="text-[10px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2 py-1.5 rounded-lg hover:border-blue-500 hover:text-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-zinc-700 dark:text-zinc-300 shadow-sm"
                            >
                                {qp.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input Area */}
                <div className="relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                        placeholder="Ask ANC Intelligence..."
                        className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10 shadow-sm"
                    />
                    <button
                        onClick={() => handleSendMessage()}
                        disabled={aiLoading || !input.trim() || !aiWorkspaceSlug}
                        className="absolute right-2 top-2 p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-30"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RfpSidebar;
