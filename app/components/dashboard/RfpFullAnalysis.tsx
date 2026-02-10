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
    X,
    AlertTriangle,
    DollarSign,
    Calendar,
    Shield,
    Monitor,
    CheckCircle2,
    XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

// ============================================================================
// TYPES
// ============================================================================

interface SectionInfo {
    heading: string;
    page: number;
    category: string;
    score: number;
    wordCount: number;
    skipReason: string | null;
}

interface OverviewResult {
    success: boolean;
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
}

interface SpecResult {
    success: boolean;
    specs: Array<{
        formId: string;
        screenName: string;
        location?: string;
        widthFt?: number;
        heightFt?: number;
        widthPx?: number;
        heightPx?: number;
        pitchMm?: number;
        brightness?: number;
        maxPower?: number;
        weight?: number;
        hardware?: string;
        processing?: string;
        environment?: string;
        quantity?: number;
        confidence: number;
    }>;
    method: string;
    stats: any;
}

interface PricingResult {
    success: boolean;
    sections: Array<{
        sectionName: string;
        sectionNumber: string | null;
        estimatedTotal: number | null;
        lineItemCount: number;
        hasTax: boolean;
        hasBond: boolean;
        alternates: Array<{
            id: string;
            description: string;
            priceDifference: number | null;
            type: string;
            confidence: number;
        }>;
        confidence: number;
    }>;
    alternates: Array<{
        id: string;
        description: string;
        priceDifference: number | null;
        type: string;
        confidence: number;
    }>;
    stats: any;
}

interface ScheduleResult {
    success: boolean;
    schedule: Array<{
        phaseName: string;
        phaseNumber: string | null;
        duration: string | null;
        startDate: string | null;
        endDate: string | null;
        tasks: Array<{ name: string; duration: string | null; notes?: string }>;
        confidence: number;
    }>;
    warranty: {
        baseYears: number | null;
        extendedYears: number | null;
        responseTime: string | null;
        slaLevel: string | null;
        sparePartsPercent: number | null;
        preventativeVisitsPerYear: number | null;
        annualCost: number | null;
        terms: string[];
        confidence: number;
    };
    method: string;
    stats: any;
}

type TabId = "overview" | "specs" | "pricing" | "schedule";

interface PipelineStatus {
    overview: "idle" | "running" | "done" | "failed";
    specs: "idle" | "running" | "done" | "failed";
    pricing: "idle" | "running" | "done" | "failed";
    schedule: "idle" | "running" | "done" | "failed";
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function RfpFullAnalysis() {
    const [activeTab, setActiveTab] = useState<TabId>("overview");
    const [pipeline, setPipeline] = useState<PipelineStatus>({
        overview: "idle", specs: "idle", pricing: "idle", schedule: "idle",
    });
    const [overview, setOverview] = useState<OverviewResult | null>(null);
    const [specData, setSpecData] = useState<SpecResult | null>(null);
    const [pricingData, setPricingData] = useState<PricingResult | null>(null);
    const [scheduleData, setScheduleData] = useState<ScheduleResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showSections, setShowSections] = useState(false);
    const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dragCounter = useRef(0);

    const isProcessing = Object.values(pipeline).some(s => s === "running");
    const isDone = Object.values(pipeline).some(s => s === "done" || s === "failed") && !isProcessing;

    const processFile = useCallback(async (file: File) => {
        if (!file || file.type !== "application/pdf") return;

        setError(null);
        setOverview(null);
        setSpecData(null);
        setPricingData(null);
        setScheduleData(null);
        setActiveTab("overview");
        setPipeline({ overview: "running", specs: "running", pricing: "running", schedule: "running" });

        const makeForm = () => {
            const fd = new FormData();
            fd.append("file", file);
            return fd;
        };

        // Fire all 4 in parallel
        const [ovRes, spRes, prRes, scRes] = await Promise.allSettled([
            // Overview
            (async () => {
                const fd = makeForm();
                fd.append("mode", "full");
                const res = await fetch("/api/rfp/process", { method: "POST", body: fd });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setOverview(data);
                setPipeline(p => ({ ...p, overview: "done" }));
                return data;
            })(),
            // Specs
            (async () => {
                const res = await fetch("/api/rfp/extract-specs", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setSpecData(data);
                setPipeline(p => ({ ...p, specs: "done" }));
                return data;
            })(),
            // Pricing
            (async () => {
                const res = await fetch("/api/rfp/extract-pricing", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setPricingData(data);
                setPipeline(p => ({ ...p, pricing: "done" }));
                return data;
            })(),
            // Schedule
            (async () => {
                const res = await fetch("/api/rfp/extract-schedule", { method: "POST", body: makeForm() });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || `${res.status}`);
                setScheduleData(data);
                setPipeline(p => ({ ...p, schedule: "done" }));
                return data;
            })(),
        ]);

        // Mark failures
        if (ovRes.status === "rejected") setPipeline(p => ({ ...p, overview: "failed" }));
        if (spRes.status === "rejected") setPipeline(p => ({ ...p, specs: "failed" }));
        if (prRes.status === "rejected") setPipeline(p => ({ ...p, pricing: "failed" }));
        if (scRes.status === "rejected") setPipeline(p => ({ ...p, schedule: "failed" }));

        const allFailed = [ovRes, spRes, prRes, scRes].every(r => r.status === "rejected");
        if (allFailed) {
            setError("All extractors failed. Check the PDF format and try again.");
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.types.includes("Files")) setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    }, [processFile]);

    const handleCopy = useCallback(() => {
        let text = "";
        if (activeTab === "overview" && overview?.extraction) text = overview.extraction;
        else if (activeTab === "specs" && specData?.specs) text = JSON.stringify(specData.specs, null, 2);
        else if (activeTab === "pricing" && pricingData) text = JSON.stringify({ sections: pricingData.sections, alternates: pricingData.alternates }, null, 2);
        else if (activeTab === "schedule" && scheduleData) text = JSON.stringify({ schedule: scheduleData.schedule, warranty: scheduleData.warranty }, null, 2);

        if (text) {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [activeTab, overview, specData, pricingData, scheduleData]);

    const handleReset = () => {
        setOverview(null);
        setSpecData(null);
        setPricingData(null);
        setScheduleData(null);
        setError(null);
        setPipeline({ overview: "idle", specs: "idle", pricing: "idle", schedule: "idle" });
        setActiveTab("overview");
    };

    const togglePhase = (idx: number) => {
        setExpandedPhases(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx); else next.add(idx);
            return next;
        });
    };

    const fmt = (n: number | null | undefined) => n != null ? `$${n.toLocaleString()}` : "—";

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

    const typeBadge = (type: string) => {
        const map: Record<string, string> = {
            upgrade: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            "add-on": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
            deduct: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
            downgrade: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
            option: "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300",
        };
        return map[type] || map.option;
    };

    // ── TABS CONFIG ─────────────────────────────────────────────────────────
    const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; status: keyof PipelineStatus; progressLabel: string }> = [
        { id: "overview", label: "Overview", icon: <FileText className="w-3.5 h-3.5" />, status: "overview", progressLabel: "Scanning structure..." },
        { id: "specs", label: "Specs", icon: <Monitor className="w-3.5 h-3.5" />, status: "specs", progressLabel: "Extracting specs..." },
        { id: "pricing", label: "Pricing", icon: <DollarSign className="w-3.5 h-3.5" />, status: "pricing", progressLabel: "Mapping pricing..." },
        { id: "schedule", label: "Schedule & Warranty", icon: <Calendar className="w-3.5 h-3.5" />, status: "schedule", progressLabel: "Extracting schedule..." },
    ];

    // ── RENDER ──────────────────────────────────────────────────────────────

    return (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                        <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-foreground">RFP Intelligence</h2>
                        <p className="text-xs text-muted-foreground">
                            Drop a PDF — specs, pricing, schedule & warranty extracted in parallel
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {isDone && (
                        <button onClick={handleReset} className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors">
                            New Analysis
                        </button>
                    )}
                    {isDone && (
                        <button onClick={handleCopy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border transition-colors">
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? "Copied" : "Copy"}
                        </button>
                    )}
                </div>
            </div>

            {/* Upload Zone — full width, proper drag-drop */}
            {!isDone && !isProcessing && !error && (
                <div
                    className="p-6"
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                >
                    <label htmlFor="rfp-full-upload" className={cn(
                        "flex flex-col items-center justify-center w-full py-16 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                        isDragging
                            ? "border-red-500 bg-red-50/70 dark:border-red-400 dark:bg-red-900/20 scale-[1.005]"
                            : "border-border hover:border-red-400 dark:hover:border-red-500 hover:bg-muted/30"
                    )}>
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                            isDragging ? "bg-red-100 dark:bg-red-900/30" : "bg-muted/50"
                        )}>
                            <Upload className={cn("w-7 h-7", isDragging ? "text-red-500 dark:text-red-400" : "text-muted-foreground")} />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                            {isDragging ? "Drop PDF to analyze" : "Drop your RFP or bid document here"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">PDF up to 50MB — or click to browse</p>
                        <div className="flex items-center gap-4 mt-5">
                            {[{ icon: <Monitor className="w-3.5 h-3.5" />, label: "Display Specs" }, { icon: <DollarSign className="w-3.5 h-3.5" />, label: "Pricing" }, { icon: <Calendar className="w-3.5 h-3.5" />, label: "Schedule" }, { icon: <Shield className="w-3.5 h-3.5" />, label: "Warranty" }].map(t => (
                                <span key={t.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                    {t.icon} {t.label}
                                </span>
                            ))}
                        </div>
                    </label>
                    <input ref={fileInputRef} id="rfp-full-upload" type="file" accept=".pdf" onChange={handleFileSelect} className="hidden" />
                </div>
            )}

            {/* Processing Pipeline */}
            {isProcessing && (
                <div className="px-6 py-10 flex flex-col items-center gap-6">
                    <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                    <p className="text-sm font-semibold text-foreground">Analyzing document...</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
                        {tabs.map(t => {
                            const status = pipeline[t.status];
                            return (
                                <div key={t.id} className={cn("flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium", status === "done" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400" : status === "failed" ? "border-red-200 bg-red-50 text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" : "border-border bg-muted/30 text-muted-foreground")}>
                                    {status === "running" && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
                                    {status === "done" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                                    {status === "failed" && <XCircle className="w-3.5 h-3.5 shrink-0" />}
                                    {status === "idle" && t.icon}
                                    <span className="truncate">{status === "running" ? t.progressLabel : t.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Error */}
            {error && !isProcessing && (
                <div className="px-6 py-10 flex flex-col items-center">
                    <AlertTriangle className="w-8 h-8 text-red-500 mb-3" />
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Processing Failed</p>
                    <p className="text-xs text-muted-foreground max-w-md text-center mb-4">{error}</p>
                    <button onClick={handleReset} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">Try Again</button>
                </div>
            )}

            {/* Results */}
            {isDone && !error && (
                <>
                    {/* Tab Bar */}
                    <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-border overflow-x-auto">
                        {tabs.map(t => {
                            const status = pipeline[t.status];
                            const isActive = activeTab === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => setActiveTab(t.id)}
                                    disabled={status === "failed"}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                                        isActive ? "bg-red-500 text-white shadow-sm shadow-red-500/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                        status === "failed" && "opacity-40 cursor-not-allowed"
                                    )}
                                >
                                    {t.icon}
                                    {t.label}
                                    {status === "failed" && <XCircle className="w-3 h-3 text-red-400" />}
                                </button>
                            );
                        })}
                    </div>

                    {/* Tab Content */}
                    <div className="p-5 max-h-[600px] overflow-y-auto">
                            {/* ── OVERVIEW TAB ── */}
                            {activeTab === "overview" && overview && (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <StatCard label="Pages" value={overview.totalPages} />
                                        <StatCard label="Sections" value={overview.stats.totalSections} />
                                        <StatCard label="Analyzed" value={overview.stats.highValueCount} color="red" />
                                        <StatCard label="Noise Cut" value={`${overview.stats.filteredOutPercent}%`} color="green" />
                                    </div>

                                    {/* Section Map */}
                                    <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                                        <button onClick={() => setShowSections(!showSections)} className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Section Map — {overview.sections.length} sections</span>
                                            </div>
                                            {showSections ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                                        </button>
                                        {showSections && (
                                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[250px] overflow-y-auto">
                                                {overview.sections.map((s, i) => (
                                                    <div key={i} className={cn("flex items-center gap-3 px-4 py-1.5 text-xs", s.score <= 3 && "opacity-50")}>
                                                        <span className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0", scoreColor(s.score))}>{s.score}</span>
                                                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-medium shrink-0", categoryColor(s.category))}>{s.category}</span>
                                                        <span className="flex-1 text-zinc-700 dark:text-zinc-300 truncate">{s.heading}</span>
                                                        <span className="text-zinc-400 shrink-0">p.{s.page}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {overview.extraction && (
                                        <div className="prose prose-sm max-w-none prose-zinc dark:prose-invert text-xs leading-relaxed bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 max-h-[50vh] overflow-y-auto [&>p]:my-1.5 [&>ul]:my-1 [&>ol]:my-1 [&>h2]:text-sm [&>h2]:mt-4 [&>h2]:mb-1.5 [&>h3]:text-xs [&>h3]:mt-3 [&>table]:text-[10px] [&>table]:my-2">
                                            <ReactMarkdown>{overview.extraction}</ReactMarkdown>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── SPECS TAB ── */}
                            {activeTab === "specs" && (
                                <div className="space-y-4">
                                    {specData?.specs && specData.specs.length > 0 ? (
                                        <>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-zinc-900 dark:text-white">{specData.specs.length} Display{specData.specs.length !== 1 ? "s" : ""} Extracted</span>
                                                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold", specData.method === "ai-assisted" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300")}>{specData.method}</span>
                                            </div>
                                            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                                                <table className="w-full text-[10px]">
                                                    <thead>
                                                        <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-left">
                                                            <th className="px-3 py-2 font-semibold">Name</th>
                                                            <th className="px-3 py-2 font-semibold">Location</th>
                                                            <th className="px-3 py-2 font-semibold">Dimensions</th>
                                                            <th className="px-3 py-2 font-semibold">Pitch</th>
                                                            <th className="px-3 py-2 font-semibold">Brightness</th>
                                                            <th className="px-3 py-2 font-semibold">Power</th>
                                                            <th className="px-3 py-2 font-semibold">Weight</th>
                                                            <th className="px-3 py-2 font-semibold">Hardware</th>
                                                            <th className="px-3 py-2 font-semibold text-center">Confidence</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                        {specData.specs.map((s, i) => (
                                                            <tr key={i} className="text-zinc-700 dark:text-zinc-300">
                                                                <td className="px-3 py-2 font-medium">{s.screenName || s.formId}</td>
                                                                <td className="px-3 py-2">{s.location || "—"}</td>
                                                                <td className="px-3 py-2">{s.widthFt && s.heightFt ? `${s.heightFt}' × ${s.widthFt}'` : "—"}</td>
                                                                <td className="px-3 py-2">{s.pitchMm ? `${s.pitchMm}mm` : "—"}</td>
                                                                <td className="px-3 py-2">{s.brightness ? `${s.brightness.toLocaleString()} nits` : "—"}</td>
                                                                <td className="px-3 py-2">{s.maxPower ? `${s.maxPower.toLocaleString()}W` : "—"}</td>
                                                                <td className="px-3 py-2">{s.weight ? `${s.weight.toLocaleString()} lbs` : "—"}</td>
                                                                <td className="px-3 py-2">{s.hardware || "—"}</td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold", s.confidence >= 0.8 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : s.confidence >= 0.5 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}>{Math.round(s.confidence * 100)}%</span>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : pipeline.specs === "failed" ? (
                                        <EmptyState icon={<XCircle className="w-8 h-8 text-red-400" />} text="Spec extraction failed" />
                                    ) : (
                                        <EmptyState icon={<Monitor className="w-8 h-8 text-zinc-300" />} text="No display specs found in this document" />
                                    )}
                                </div>
                            )}

                            {/* ── PRICING TAB ── */}
                            {activeTab === "pricing" && (
                                <div className="space-y-5">
                                    {pricingData?.sections && pricingData.sections.length > 0 ? (
                                        <>
                                            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                                                <table className="w-full text-[10px]">
                                                    <thead>
                                                        <tr className="bg-zinc-50 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-left">
                                                            <th className="px-3 py-2 font-semibold">#</th>
                                                            <th className="px-3 py-2 font-semibold">Section</th>
                                                            <th className="px-3 py-2 font-semibold text-right">Est. Total</th>
                                                            <th className="px-3 py-2 font-semibold text-center">Items</th>
                                                            <th className="px-3 py-2 font-semibold text-center">Tax</th>
                                                            <th className="px-3 py-2 font-semibold text-center">Bond</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                        {pricingData.sections.map((s, i) => (
                                                            <tr key={i} className="text-zinc-700 dark:text-zinc-300">
                                                                <td className="px-3 py-2 text-zinc-400">{s.sectionNumber || i + 1}</td>
                                                                <td className="px-3 py-2 font-medium">{s.sectionName}</td>
                                                                <td className="px-3 py-2 text-right font-mono">{fmt(s.estimatedTotal)}</td>
                                                                <td className="px-3 py-2 text-center">{s.lineItemCount}</td>
                                                                <td className="px-3 py-2 text-center">{s.hasTax ? "✓" : "—"}</td>
                                                                <td className="px-3 py-2 text-center">{s.hasBond ? "✓" : "—"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    {pricingData.stats?.estimatedProjectTotal && (
                                                        <tfoot>
                                                            <tr className="bg-zinc-50 dark:bg-zinc-800 font-bold text-zinc-900 dark:text-white">
                                                                <td className="px-3 py-2" colSpan={2}>Estimated Project Total</td>
                                                                <td className="px-3 py-2 text-right font-mono">{fmt(pricingData.stats.estimatedProjectTotal)}</td>
                                                                <td colSpan={3} />
                                                            </tr>
                                                        </tfoot>
                                                    )}
                                                </table>
                                            </div>

                                            {pricingData.alternates.length > 0 && (
                                                <div className="space-y-2">
                                                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Alternates ({pricingData.alternates.length})</h4>
                                                    <div className="space-y-1.5">
                                                        {pricingData.alternates.map((a, i) => (
                                                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs">
                                                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase", typeBadge(a.type))}>{a.type}</span>
                                                                <span className="flex-1 text-zinc-700 dark:text-zinc-300">{a.description}</span>
                                                                {a.priceDifference != null && (
                                                                    <span className={cn("font-mono font-semibold", a.priceDifference >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                                                        {a.priceDifference >= 0 ? "+" : ""}{fmt(a.priceDifference)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : pipeline.pricing === "failed" ? (
                                        <EmptyState icon={<XCircle className="w-8 h-8 text-red-400" />} text="Pricing extraction failed" />
                                    ) : (
                                        <EmptyState icon={<DollarSign className="w-8 h-8 text-zinc-300" />} text="No pricing sections found" />
                                    )}
                                </div>
                            )}

                            {/* ── SCHEDULE & WARRANTY TAB ── */}
                            {activeTab === "schedule" && (
                                <div className="space-y-6">
                                    {/* Schedule */}
                                    {scheduleData?.schedule && scheduleData.schedule.length > 0 ? (
                                        <div className="space-y-2">
                                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                                                Schedule — {scheduleData.schedule.length} Phases
                                                <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-semibold", scheduleData.method === "ai-assisted" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300")}>{scheduleData.method}</span>
                                            </h4>
                                            <div className="space-y-1.5">
                                                {scheduleData.schedule.map((phase, idx) => (
                                                    <div key={idx} className="border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                                                        <button onClick={() => togglePhase(idx)} className="w-full flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700/80 transition-colors text-left">
                                                            <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold shrink-0">{phase.phaseNumber || idx + 1}</span>
                                                            <span className="flex-1 text-xs font-semibold text-zinc-900 dark:text-white">{phase.phaseName}</span>
                                                            {phase.duration && <span className="text-[10px] text-zinc-500 dark:text-zinc-400 shrink-0">{phase.duration}</span>}
                                                            {expandedPhases.has(idx) ? <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                                                        </button>
                                                        {expandedPhases.has(idx) && phase.tasks.length > 0 && (
                                                            <div className="border-t border-zinc-100 dark:border-zinc-700 divide-y divide-zinc-50 dark:divide-zinc-800">
                                                                {phase.tasks.map((task, ti) => (
                                                                    <div key={ti} className="flex items-center gap-3 px-4 py-1.5 pl-14 text-[10px] text-zinc-600 dark:text-zinc-400">
                                                                        <span className="flex-1">{task.name}</span>
                                                                        {task.duration && <span className="text-zinc-400 dark:text-zinc-500 shrink-0">{task.duration}</span>}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : pipeline.schedule !== "failed" ? (
                                        <EmptyState icon={<Calendar className="w-8 h-8 text-zinc-300" />} text="No schedule data found" />
                                    ) : (
                                        <EmptyState icon={<XCircle className="w-8 h-8 text-red-400" />} text="Schedule extraction failed" />
                                    )}

                                    {/* Warranty */}
                                    {scheduleData?.warranty && scheduleData.warranty.terms.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                                <Shield className="w-3.5 h-3.5 text-teal-500" />
                                                Warranty & Service
                                            </h4>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                <WarrantyCard label="Base Warranty" value={scheduleData.warranty.baseYears ? `${scheduleData.warranty.baseYears} years` : null} />
                                                <WarrantyCard label="Extended" value={scheduleData.warranty.extendedYears ? `${scheduleData.warranty.extendedYears} years` : null} />
                                                <WarrantyCard label="Response Time" value={scheduleData.warranty.responseTime} />
                                                <WarrantyCard label="SLA Level" value={scheduleData.warranty.slaLevel} />
                                                <WarrantyCard label="Spare Parts" value={scheduleData.warranty.sparePartsPercent ? `${scheduleData.warranty.sparePartsPercent}%` : null} />
                                                <WarrantyCard label="Maint. Visits/yr" value={scheduleData.warranty.preventativeVisitsPerYear?.toString() ?? null} />
                                                <WarrantyCard label="Annual Cost" value={scheduleData.warranty.annualCost ? fmt(scheduleData.warranty.annualCost) : null} />
                                                <WarrantyCard label="Confidence" value={`${Math.round(scheduleData.warranty.confidence * 100)}%`} />
                                            </div>
                                            {scheduleData.warranty.terms.length > 0 && (
                                                <div className="border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 space-y-1 max-h-[200px] overflow-y-auto">
                                                    <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Raw Terms</p>
                                                    {scheduleData.warranty.terms.map((t, i) => (
                                                        <p key={i} className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed">• {t}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                    </>
                )}
        </div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ label, value, color }: { label: string; value: string | number; color?: "red" | "green" }) {
    const bg = color === "red" ? "bg-red-50 dark:bg-red-900/20" : color === "green" ? "bg-green-50 dark:bg-green-900/20" : "bg-zinc-50 dark:bg-zinc-800";
    const textColor = color === "red" ? "text-red-600 dark:text-red-400" : color === "green" ? "text-green-600 dark:text-green-400" : "text-zinc-900 dark:text-white";
    const labelColor = color === "red" ? "text-red-500" : color === "green" ? "text-green-500" : "text-zinc-500";
    return (
        <div className={cn("px-4 py-2.5 rounded-xl text-center", bg)}>
            <div className={cn("text-xl font-bold", textColor)}>{value}</div>
            <div className={cn("text-[9px] uppercase tracking-wider", labelColor)}>{label}</div>
        </div>
    );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            {icon}
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">{text}</p>
        </div>
    );
}

function WarrantyCard({ label, value }: { label: string; value: string | null }) {
    return (
        <div className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
            <div className="text-[9px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</div>
            <div className={cn("text-xs font-semibold mt-0.5", value ? "text-zinc-900 dark:text-white" : "text-zinc-300 dark:text-zinc-600")}>{value || "—"}</div>
        </div>
    );
}
