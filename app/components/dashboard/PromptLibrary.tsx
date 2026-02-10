"use client";

import React, { useState, useCallback } from "react";
import {
    Search,
    ChevronRight,
    Sparkles,
    Loader2,
    ArrowLeft,
    FileText,
    Send,
    Copy,
    Check,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import {
    PROMPT_CATEGORIES,
    AI_PROMPTS,
    searchPrompts,
    type AiPrompt,
    type PromptCategory,
} from "@/lib/ai-prompts";

// ============================================================================
// TYPES
// ============================================================================

interface PromptLibraryProps {
    /** Called when a prompt should be sent to the copilot chat instead */
    onSendToCopilot?: (prompt: string, userInput: string) => void;
    /** Pipeline context to inject */
    pipelineContext?: string;
    className?: string;
}

type View = "categories" | "category-detail" | "prompt-detail" | "result";

// ============================================================================
// COMPONENT
// ============================================================================

export default function PromptLibrary({
    onSendToCopilot,
    pipelineContext,
    className,
}: PromptLibraryProps) {
    const [view, setView] = useState<View>("categories");
    const [selectedCategory, setSelectedCategory] = useState<PromptCategory | null>(null);
    const [selectedPrompt, setSelectedPrompt] = useState<AiPrompt | null>(null);
    const [userInput, setUserInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const filteredPrompts = searchQuery.trim()
        ? searchPrompts(searchQuery)
        : null;

    const handleSelectCategory = (cat: PromptCategory) => {
        setSelectedCategory(cat);
        setView("category-detail");
    };

    const handleSelectPrompt = (prompt: AiPrompt) => {
        setSelectedPrompt(prompt);
        setUserInput("");
        setResult(null);
        setView("prompt-detail");
    };

    const handleBack = () => {
        if (view === "result") {
            setView("prompt-detail");
        } else if (view === "prompt-detail") {
            setView("category-detail");
        } else if (view === "category-detail") {
            setView("categories");
            setSelectedCategory(null);
        }
    };

    const handleRun = useCallback(async () => {
        if (!selectedPrompt) return;

        // If the prompt doesn't need a document and has no input placeholder,
        // send directly to copilot
        if (onSendToCopilot && !selectedPrompt.requiresDocument) {
            onSendToCopilot(selectedPrompt.prompt, userInput);
            return;
        }

        setIsLoading(true);
        setResult(null);

        try {
            const res = await fetch("/api/copilot/prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    promptId: selectedPrompt.id,
                    userInput: userInput.trim() || undefined,
                    pipelineContext,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setResult(`**Error:** ${data.response || data.error || res.statusText}`);
            } else {
                setResult(data.response);
            }
            setView("result");
        } catch (err: any) {
            setResult(`**Connection error:** ${err?.message || String(err)}`);
            setView("result");
        } finally {
            setIsLoading(false);
        }
    }, [selectedPrompt, userInput, pipelineContext, onSendToCopilot]);

    const handleCopy = useCallback(() => {
        if (result) {
            navigator.clipboard.writeText(result);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [result]);

    // ── RENDER ──────────────────────────────────────────────────────────────

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80">
                {view !== "categories" && (
                    <button
                        onClick={handleBack}
                        className="p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                    </button>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="p-1.5 rounded-lg" style={{ backgroundColor: "rgba(10,82,239,0.15)" }}>
                        <Sparkles className="w-4 h-4" style={{ color: "#0A52EF" }} />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {view === "categories" && "AI Operations"}
                            {view === "category-detail" && selectedCategory?.name}
                            {view === "prompt-detail" && selectedPrompt?.shortLabel}
                            {view === "result" && selectedPrompt?.shortLabel}
                        </h3>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {view === "categories" && `${AI_PROMPTS.length} prompts across ${PROMPT_CATEGORIES.length} categories`}
                            {view === "category-detail" && selectedCategory?.description}
                            {view === "prompt-detail" && selectedPrompt?.description}
                            {view === "result" && "Result"}
                        </p>
                    </div>
                </div>
            </div>

            {/* Search (categories view only) */}
            {view === "categories" && (
                <div className="px-4 py-2 border-b border-zinc-200 dark:border-zinc-700">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search prompts..."
                            className="w-full pl-8 pr-3 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-600 rounded-lg focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/30 transition-colors text-zinc-900 dark:text-white placeholder:text-zinc-400"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                                <X className="w-3 h-3 text-zinc-400" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* ── Categories View ── */}
                {view === "categories" && !filteredPrompts && (
                    <div className="p-3 space-y-1.5">
                        {PROMPT_CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => handleSelectCategory(cat)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-all text-left group"
                            >
                                <span className="text-lg shrink-0">{cat.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">{cat.name}</div>
                                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{cat.description}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">{cat.prompts.length}</span>
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Search Results ── */}
                {view === "categories" && filteredPrompts && (
                    <div className="p-3 space-y-1.5">
                        {filteredPrompts.length === 0 ? (
                            <div className="text-center py-8 text-xs text-zinc-500">
                                No prompts match &quot;{searchQuery}&quot;
                            </div>
                        ) : (
                            filteredPrompts.map((prompt) => (
                                <button
                                    key={prompt.id}
                                    onClick={() => handleSelectPrompt(prompt)}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-all text-left group"
                                >
                                    <span className="text-lg shrink-0">{prompt.categoryIcon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-zinc-900 dark:text-white">{prompt.name}</div>
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{prompt.description}</div>
                                    </div>
                                    {prompt.requiresDocument && (
                                        <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                    )}
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors shrink-0" />
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* ── Category Detail View ── */}
                {view === "category-detail" && selectedCategory && (
                    <div className="p-3 space-y-1.5">
                        {selectedCategory.prompts.map((prompt) => (
                            <button
                                key={prompt.id}
                                onClick={() => handleSelectPrompt(prompt)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-all text-left group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">{prompt.name}</div>
                                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">{prompt.description}</div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {prompt.requiresDocument && (
                                        <FileText className="w-3.5 h-3.5 text-zinc-400" />
                                    )}
                                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Prompt Detail View ── */}
                {view === "prompt-detail" && selectedPrompt && (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{selectedPrompt.categoryIcon}</span>
                                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{selectedPrompt.name}</h4>
                            </div>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedPrompt.description}</p>
                            <div className="flex flex-wrap gap-1">
                                {selectedPrompt.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 font-medium"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {selectedPrompt.requiresDocument && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                                    This prompt works best with a document uploaded to the project workspace in AnythingLLM.
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                Your Input
                            </label>
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder={selectedPrompt.inputPlaceholder || "Add context or details..."}
                                rows={4}
                                className="w-full px-3 py-2.5 text-xs text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-600 rounded-xl focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/30 transition-colors resize-y placeholder:text-zinc-400"
                            />
                        </div>

                        <button
                            onClick={handleRun}
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-xs font-bold transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ backgroundColor: "#0A52EF" }}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Run Prompt
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* ── Result View ── */}
                {view === "result" && result && (
                    <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">{selectedPrompt?.categoryIcon}</span>
                                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">{selectedPrompt?.name}</h4>
                            </div>
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        </div>
                        <div className="prose prose-sm max-w-none prose-zinc dark:prose-invert text-xs leading-relaxed bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-4 max-h-[60vh] overflow-y-auto [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>h2]:text-sm [&>h2]:mt-3 [&>h2]:mb-1 [&>h3]:text-xs [&>h3]:mt-2 [&>table]:text-[10px]">
                            <ReactMarkdown>{result}</ReactMarkdown>
                        </div>
                        <button
                            onClick={() => {
                                setResult(null);
                                setView("prompt-detail");
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-600 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            Run Again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
