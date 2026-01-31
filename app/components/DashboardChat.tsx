"use client";

import React, { useState, useRef, useEffect } from "react";
import {
    Send,
    Sparkles,
    X,
    Minimize2,
    Command,
    Mic,
    Brain,
    ChevronDown,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface Message {
    role: "user" | "assistant";
    content: string;
    sources?: any[];
    thinking?: string;
}

export default function DashboardChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setIsOpen(true);
                setIsMinimized(false);
            }
            if (e.key === "Escape") {
                if (!isMinimized) {
                    setIsMinimized(true);
                } else {
                    setIsOpen(false);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isMinimized]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput("");
        setMessages(prev => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/dashboard/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    workspace: "dashboard-vault"
                }),
            });

            const data = await response.json();

            let content = data.response || "No response received.";
            let thinking = data.thinking || null;

            // Robust frontend parsing for <think> tags if backend missed them
            if (!thinking && content.includes("<think>")) {
                const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
                if (thinkMatch) {
                    thinking = thinkMatch[1].trim();
                    content = content.replace(/<think>[\s\S]*?<\/think>/, "").trim();
                }
            }

            setMessages(prev => [...prev, {
                role: "assistant",
                content: content,
                sources: data.sources || [],
                thinking: thinking
            }]);
        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "I encountered an error. Please try again."
            }]);
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="relative w-full">
            {/* Expanded Intelligence Panel */}
            <AnimatePresence>
                {isOpen && !isMinimized && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98, y: 20 }}
                        className="absolute bottom-20 left-0 right-0 h-[500px] mb-4 bg-[#09090b] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-50 pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#0A52EF]/10 rounded-lg flex items-center justify-center">
                                    <Brain className="w-4 h-4 text-[#0A52EF]" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Intelligence Core</h3>
                                    <p className="text-[10px] text-zinc-600">Connected to dashboard-vault</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsMinimized(true)}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                            {messages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                                    <Sparkles className="w-8 h-8 text-[#0A52EF]" />
                                    <div className="max-w-sm space-y-2">
                                        <p className="text-sm font-bold">Strategic Intelligence Ready</p>
                                        <p className="text-xs text-zinc-600">
                                            Ask me anything about your proposals, budgets, or project history. I have access to all documents in the vault.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((msg, i) => (
                                        <div key={i} className={cn(
                                            "flex flex-col space-y-2",
                                            msg.role === "user" ? "items-end" : "items-start"
                                        )}>
                                            {msg.role === "user" ? (
                                                <div className="max-w-[85%] px-4 py-2 bg-[#0A52EF] text-white rounded-2xl text-sm leading-relaxed">
                                                    {msg.content}
                                                </div>
                                            ) : (
                                                <div className="max-w-full space-y-3">
                                                    {/* Thinking Accordion */}
                                                    {msg.thinking && (
                                                        <Accordion type="single" collapsible className="w-full">
                                                            <AccordionItem value="thinking" className="border border-zinc-800 rounded-lg bg-zinc-900/50 px-4">
                                                                <AccordionTrigger className="py-3 hover:no-underline">
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <Brain className="w-3.5 h-3.5 text-purple-400" />
                                                                        <span className="font-medium text-zinc-400">Thinking Process</span>
                                                                    </div>
                                                                </AccordionTrigger>
                                                                <AccordionContent className="pb-4 pt-2">
                                                                    <div className="text-xs text-zinc-400 leading-relaxed space-y-2">
                                                                        {msg.thinking.split('\n').map((line, idx) => (
                                                                            <p key={idx} className="">{line}</p>
                                                                        ))}
                                                                    </div>
                                                                </AccordionContent>
                                                            </AccordionItem>
                                                        </Accordion>
                                                    )}

                                                    {/* Main Response */}
                                                    <div className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-sm text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                                    </div>

                                                    {/* Sources */}
                                                    {msg.sources && msg.sources.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {msg.sources.slice(0, 3).map((source: any, idx: number) => (
                                                                <div key={idx} className="px-2 py-1 bg-zinc-900/50 border border-zinc-800 rounded text-[10px] text-zinc-500">
                                                                    📄 {source.title || `Source ${idx + 1}`}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isLoading && (
                                        <div className="flex items-center gap-2 text-zinc-500 text-sm">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Thinking...</span>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Bottom Command Bar */}
            <div className={cn(
                "w-full h-14 bg-[#09090b]/90 backdrop-blur-3xl border border-zinc-800 rounded-xl flex items-center px-4 transition-all duration-300 pointer-events-auto",
                isOpen && !isMinimized ? "ring-2 ring-[#0A52EF]/30 border-[#0A52EF]/50" : "hover:border-zinc-600"
            )}>
                <div className="flex items-center gap-3 mr-4">
                    <Command className="w-4 h-4 text-zinc-600" />
                    <div className="w-px h-6 bg-zinc-800" />
                </div>

                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Ask the Intelligence Core anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onFocus={() => { setIsOpen(true); setIsMinimized(false); }}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-200 placeholder-zinc-700 disabled:opacity-50"
                />

                <div className="flex items-center gap-2 ml-4">
                    {!input && !isOpen && (
                        <div className="flex gap-2 mr-2">
                            <div className="px-1.5 py-0.5 border border-zinc-800 rounded text-[9px] font-bold text-zinc-600">⌘</div>
                            <div className="px-1.5 py-0.5 border border-zinc-800 rounded text-[9px] font-bold text-zinc-600">K</div>
                        </div>
                    )}
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            input && !isLoading ? "text-[#0A52EF] hover:bg-[#0A52EF]/10" : "text-zinc-700 pointer-events-none"
                        )}
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
