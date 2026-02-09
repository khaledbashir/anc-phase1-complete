"use client";

import React, { useState, useEffect, useRef } from "react";
import { useProposalContext } from "@/contexts/ProposalContext";
import { useFormContext } from "react-hook-form";
import {
    Send,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    ChevronUp,
    ChevronDown,
    Bot,
    Target,
    FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeGaps, calculateCompletionRate, GapItem } from "@/lib/gap-analysis";

interface AiCommandBarProps {
    isExpanded: boolean;
    onToggle: () => void;
}

const QUICK_PROMPTS = [
    {
        label: "Set All Margins",
        prompt: "/set all margins to 25%",
        icon: Target,
        description: "Apply margin to all screens"
    },
    {
        label: "Find Delivery Date",
        prompt: "What is the requested delivery or installation date in the RFP?",
        icon: FileText,
        description: "Extract from RFP document"
    },
    {
        label: "Check Labor Rates",
        prompt: "Does the RFP specify prevailing wage or union labor rates?",
        icon: AlertCircle,
        description: "Review labor requirements"
    },
];

const AiCommandBar = ({ isExpanded, onToggle }: AiCommandBarProps) => {
    const {
        aiWorkspaceSlug,
        aiMessages,
        aiLoading,
        executeAiCommand,
        trackAiFieldModification
    } = useProposalContext();
    const { watch } = useFormContext();
    const [input, setInput] = useState("");
    const [showGaps, setShowGaps] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const formValues = watch();
    const gaps = analyzeGaps(formValues);
    const highPriorityGaps = gaps.filter(g => g.priority === "high");
    const gapCount = gaps.length;
    const completionRate = calculateCompletionRate(gapCount, gaps);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiMessages]);

    const handleSendMessage = async (msg?: string) => {
        const messageText = msg || input;
        if (!messageText.trim() || !aiWorkspaceSlug) return;

        setInput("");

        // Handle special commands
        if (messageText.startsWith("/set all margins to")) {
            const match = messageText.match(/(\d+)%?/);
            if (match) {
                const margin = parseInt(match[1]) / 100;
                const screens = formValues?.details?.screens || [];
                const modifiedFields: string[] = [];

                screens.forEach((_: any, index: number) => {
                    modifiedFields.push(`details.screens[${index}].desiredMargin`);
                });

                // Track the AI modification for ghost effect
                trackAiFieldModification(modifiedFields);
            }
        }

        await executeAiCommand(messageText);
    };

    const handleGapClick = (gap: GapItem) => {
        // Expand the form and focus on the missing field
        if (gap.screenIndex !== undefined) {
            // This would need to communicate with the Screens component
            // to expand the specific screen card
            const event = new CustomEvent('focus-screen-field', {
                detail: { screenIndex: gap.screenIndex, field: gap.field }
            });
            window.dispatchEvent(event);
        }
        setShowGaps(false);
    };

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header / Toggle Bar */}
            <button
                onClick={onToggle}
                className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border hover:bg-accent/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-[#0A52EF]/20">
                        <Bot className="w-4 h-4 text-[#0A52EF]" />
                    </div>
                    <span className="text-sm font-medium text-foreground">
                        ANC Intelligence Engine
                    </span>
                    <span className="px-2 py-0.5 bg-[#0A52EF]/20 text-[#0A52EF] text-[10px] font-medium rounded-full">
                        Active
                    </span>

                    {/* Gap Analysis Badge */}
                    {gapCount > 0 && (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowGaps(!showGaps);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setShowGaps(!showGaps);
                                }
                            }}
                            className={cn(
                                "ml-2 px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 transition-colors cursor-pointer select-none",
                                highPriorityGaps.length > 0
                                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                    : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                            )}
                        >
                            <AlertCircle className="w-3 h-3" />
                            {gapCount} gaps
                        </div>
                    )}
                    {gapCount === 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Complete
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    {/* Completion Progress */}
                    <div className="hidden md:flex items-center gap-2 mr-4">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    completionRate >= 80 ? "bg-emerald-500" :
                                        completionRate >= 50 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${completionRate}%` }}
                            />
                        </div>
                        <span className="text-xs text-muted-foreground">{Math.round(completionRate)}%</span>
                    </div>

                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <>
                    {/* Gap Analysis Panel */}
                    {showGaps && gaps.length > 0 && (
                        <div className="border-b border-border bg-muted/30">
                            <div className="p-3">
                                <p className="text-xs font-medium text-muted-foreground mb-2">
                                    Gap Analysis
                                </p>
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                    {gaps.map((gap) => (
                                        <button
                                            key={gap.id}
                                            onClick={() => handleGapClick(gap)}
                                            className="w-full flex items-center gap-2 p-2 text-left rounded-lg hover:bg-accent transition-colors"
                                        >
                                            <div className={cn(
                                                "w-1.5 h-1.5 rounded-full",
                                                gap.priority === "high" ? "bg-red-500" :
                                                    gap.priority === "medium" ? "bg-yellow-500" : "bg-muted-foreground"
                                            )} />
                                            <span className="text-xs text-foreground">{gap.description}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chat Area */}
                    <div
                        ref={scrollRef}
                        className="flex-1 overflow-y-auto p-4 space-y-4"
                    >
                        {aiMessages.length === 0 && (
                            <div className="text-center py-8 space-y-4">
                                <div className="bg-[#0A52EF]/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                                    <Sparkles className="w-6 h-6 text-[#0A52EF]" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-zinc-100 text-sm">ANC Document Brain</p>
                                    <p className="text-xs text-zinc-500 max-w-[250px] mx-auto">
                                        Ask anything about the RFP or use commands like
                                        <span className="text-[#0A52EF]">/set all margins to 25%</span>
                                    </p>
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
                                        ? "bg-[#0A52EF] text-white rounded-tr-none"
                                        : "bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-tl-none"
                                )}>
                                    {m.content}
                                </div>
                            </div>
                        ))}

                        {aiLoading && (
                            <div className="flex items-start gap-2 max-w-[90%]">
                                <div className="bg-zinc-800 px-3 py-2 rounded-2xl rounded-tl-none text-xs text-zinc-500 italic animate-pulse border border-zinc-700">
                                    Processing document context...
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Prompts */}
                    <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
                        <div className="flex flex-wrap gap-2">
                            {QUICK_PROMPTS.map((qp, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSendMessage(qp.prompt)}
                                    disabled={aiLoading || !aiWorkspaceSlug}
                                    className="flex items-center gap-1.5 text-[10px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-2 py-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300"
                                    title={qp.description}
                                >
                                    <qp.icon className="w-3 h-3" />
                                    {qp.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
                        <div className="relative">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                placeholder="Ask ANC Intelligence or type /command..."
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0A52EF] focus:border-[#0A52EF] focus:outline-none pr-10"
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={aiLoading || !input.trim() || !aiWorkspaceSlug}
                                className="absolute right-2 top-2 p-1.5 text-[#0A52EF] hover:bg-[#0A52EF]/10 rounded-lg transition-all disabled:opacity-30"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>

                        <p className="text-[10px] text-zinc-600 mt-2 text-center">
                            Try: "/set all margins to 25%" or "Extract delivery date from RFP"
                        </p>
                    </div>
                </>
            )}
        </div>
    );
};

export default AiCommandBar;
