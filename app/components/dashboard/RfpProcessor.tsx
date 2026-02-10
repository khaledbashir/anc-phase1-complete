"use client";

import React, { useState, useCallback, useRef } from "react";
import {
    Upload,
    FileText,
    Loader2,
    ChevronDown,
    ChevronRight,
    Copy,
    Check,
    Zap,
    Filter,
    Brain,
    X,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// ============================================================================
// TYPES (mirrors API response)
// ============================================================================

interface SectionInfo {
    heading: string;
    page: number;
    category: string;
    score: number;
    wordCount: number;
    skipReason: string | null;
}

interface ProcessResult {
    success: boolean;
    mode: "scan" | "full";
    fileName: string;
    totalPages: number;
    stats: {
        totalSections: number;
        highValueCount: number;
        mediumValueCount: number;
        lowValueCount: number;
        filteredOutPercent: number;
        estimatedTokensSaved: number;
    };
    sections: SectionInfo[];
    extraction?: string;
    error?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RfpProcessor() {
    const [isOpen, setIsOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState("");
    const [result, setResult] = useState<ProcessResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSections, setShowSections] = useState(false);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);
        setResult(null);
        setProcessingStage("2,847 pages. Looking for Division 11...");

        try {
            // Step 1: Quick scan (instant)
            const scanForm = new FormData();
            scanForm.append("file", file);
            scanForm.append("mode", "scan");

            const scanRes = await fetch("/api/rfp/process", {
                method: "POST",
                body: scanForm,
            });

            const scanData = await scanRes.json();

            if (!scanRes.ok) {
                throw new Error(scanData.error || `Scan failed (${scanRes.status})`);
            }

            // Show scan results immediately
            setResult({ ...scanData, mode: "scan" });
            setProcessingStage(`Found ${scanData.stats.highValueCount} high-value sections. Pulling specs and pricing...`);

            // Step 2: Full analysis (AI call)
            const fullForm = new FormData();
            fullForm.append("file", file);
            fullForm.append("mode", "full");

            const fullRes = await fetch("/api/rfp/process", {
                method: "POST",
                body: fullForm,
            });

            const fullData = await fullRes.json();

            if (!fullRes.ok) {
                throw new Error(fullData.error || `Analysis failed (${fullRes.status})`);
            }

            setResult(fullData);
            setProcessingStage("");
        } catch (err: any) {
            setError(err.message || "Failed to process PDF");
            setProcessingStage("");
        } finally {
            setIsProcessing(false);
            // Reset file input
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }, []);

    const handleCopy = useCallback(() => {
        if (result?.extraction) {
            navigator.clipboard.writeText(result.extraction);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [result]);

    const scoreColor = (score: number) => {
        if (score >= 8) return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20";
        if (score >= 5) return "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20";
        return "text-zinc-400 bg-zinc-50 dark:text-zinc-500 dark:bg-zinc-800";
    };

    const categoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            PRICING: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            DISPLAY_SPECS: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            SCOPE: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            SCHEDULE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            REQUIREMENTS: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
            WARRANTY: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
            SOFTWARE: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
            LEGAL: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
            BOILERPLATE: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600",
            TEAM: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500",
        };
        return colors[cat] || "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 left-24 md:left-28 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-white shadow-xl hover:scale-105 transition-all border border-white/20"
                style={{ backgroundColor: "#dc2626" }}
                title="Smart RFP Processor"
            >
                <Zap className="w-4 h-4" />
                <span className="text-xs font-semibold tracking-wide">RFP Intel</span>
            </button>
        );
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-[2px]"
                onClick={() => !isProcessing && setIsOpen(false)}
            />

            {/* Modal */}
            <div className="fixed inset-4 sm:inset-8 md:inset-12 lg:inset-x-[15%] lg:inset-y-8 z-[60] bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30">
                            <Zap className="w-5 h-5 text-red-600 dark:text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-zinc-900 dark:text-white">Smart RFP Processor</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                Upload a huge PDF — AI reads only what matters
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => !isProcessing && setIsOpen(false)}
                        disabled={isProcessing}
                        className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Upload Zone */}
                    {!result && !isProcessing && !error && (
                        <div className="flex flex-col items-center justify-center h-full">
                            <label
                                htmlFor="rfp-upload"
                                className="flex flex-col items-center justify-center w-full max-w-lg h-64 border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-2xl cursor-pointer hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all"
                            >
                                <Upload className="w-10 h-10 text-zinc-400 dark:text-zinc-500 mb-3" />
                                <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Drop your RFP here</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">PDF files up to 50MB</p>
                                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-3 px-8 text-center">
                                    AI will filter out legal boilerplate, team bios, and disclaimers — then extract only specs, pricing, scope, and deadlines
                                </p>
                            </label>
                            <input
                                ref={fileInputRef}
                                id="rfp-upload"
                                type="file"
                                accept=".pdf"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{processingStage}</p>
                            {result?.mode === "scan" && result.stats && (
                                <div className="mt-6 grid grid-cols-3 gap-4 text-center">
                                    <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                                        <div className="text-2xl font-bold text-zinc-900 dark:text-white">{result.stats.totalSections}</div>
                                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Sections Found</div>
                                    </div>
                                    <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20">
                                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result.stats.highValueCount}</div>
                                        <div className="text-[10px] text-red-500 uppercase tracking-wider">High Value</div>
                                    </div>
                                    <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{result.stats.filteredOutPercent}%</div>
                                        <div className="text-[10px] text-green-500 uppercase tracking-wider">Noise Filtered</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">Processing Failed</p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md text-center">{error}</p>
                            <button
                                onClick={() => { setError(null); setResult(null); }}
                                className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Results */}
                    {result && !isProcessing && result.mode === "full" && (
                        <div className="space-y-6">
                            {/* Stats Bar */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-center">
                                    <div className="text-xl font-bold text-zinc-900 dark:text-white">{result.totalPages}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Pages</div>
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-center">
                                    <div className="text-xl font-bold text-zinc-900 dark:text-white">{result.stats.totalSections}</div>
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Sections</div>
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-center">
                                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{result.stats.highValueCount}</div>
                                    <div className="text-[10px] text-red-500 uppercase tracking-wider">Analyzed</div>
                                </div>
                                <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 text-center">
                                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{result.stats.filteredOutPercent}%</div>
                                    <div className="text-[10px] text-green-500 uppercase tracking-wider">Noise Cut</div>
                                </div>
                            </div>

                            {/* Section Map (collapsible) */}
                            <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setShowSections(!showSections)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Filter className="w-4 h-4 text-zinc-500" />
                                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Section Map — {result.sections.length} sections scored</span>
                                    </div>
                                    {showSections ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                                </button>
                                {showSections && (
                                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[300px] overflow-y-auto">
                                        {result.sections.map((s, i) => (
                                            <div key={i} className={cn("flex items-center gap-3 px-4 py-2 text-xs", s.score <= 3 && "opacity-50")}>
                                                <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0", scoreColor(s.score))}>
                                                    {s.score}
                                                </span>
                                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0", categoryColor(s.category))}>
                                                    {s.category}
                                                </span>
                                                <span className="flex-1 text-zinc-700 dark:text-zinc-300 truncate">{s.heading}</span>
                                                <span className="text-zinc-400 dark:text-zinc-500 shrink-0">p.{s.page}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* AI Extraction */}
                            {result.extraction && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-red-500" />
                                            <span className="text-sm font-bold text-zinc-900 dark:text-white">AI Extraction</span>
                                        </div>
                                        <button
                                            onClick={handleCopy}
                                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                            {copied ? "Copied" : "Copy All"}
                                        </button>
                                    </div>
                                    <div className="prose prose-sm max-w-none prose-zinc dark:prose-invert text-xs leading-relaxed bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 max-h-[50vh] overflow-y-auto [&>p]:my-1.5 [&>ul]:my-1 [&>ol]:my-1 [&>h2]:text-sm [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h3]:text-xs [&>h3]:mt-3 [&>table]:text-[10px] [&>table]:my-2">
                                        <ReactMarkdown>{result.extraction}</ReactMarkdown>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setResult(null); setError(null); }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border-2 border-zinc-200 dark:border-zinc-600 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Process Another
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
