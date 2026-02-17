"use client";

/**
 * Auto-RFP Response Panel
 *
 * AI reads the RFP, extracts every screen requirement, matches products,
 * and pre-fills the estimator. Shows extracted screens for review before applying.
 */

import React, { useState, useCallback } from "react";
import {
    X, Loader2, CheckCircle2, AlertTriangle, FileSearch,
    Monitor, MapPin, Ruler, Cpu, ChevronDown, ChevronUp,
    Check, Trash2, Zap,
} from "lucide-react";
import type { EstimatorAnswers } from "./questions";

// ============================================================================
// TYPES (mirrors server types)
// ============================================================================

interface ExtractedScreen {
    name: string;
    location: string;
    widthFt: number;
    heightFt: number;
    pixelPitchMm: number | null;
    environment: "indoor" | "outdoor";
    quantity: number;
    brightness: number | null;
    serviceType: string | null;
    notes: string | null;
    confidence: number;
}

interface MatchReportEntry {
    screenName: string;
    requestedPitch: number | null;
    requestedEnv: string;
    matchedProductId: string;
    matchedProductName: string;
    fitScore: number;
}

interface ExtractedProject {
    clientName: string | null;
    projectName: string | null;
    venue: string | null;
    location: string | null;
    isOutdoor: boolean;
    isUnion: boolean;
}

interface AutoRfpResponse {
    ok: boolean;
    error?: string;
    project?: ExtractedProject;
    screens?: ExtractedScreen[];
    estimatorAnswers?: EstimatorAnswers;
    matchReport?: MatchReportEntry[];
    extractionMethod?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

interface AutoRfpPanelProps {
    open: boolean;
    onClose: () => void;
    projectId?: string;
    onApply: (answers: EstimatorAnswers) => void;
}

type Phase = "input" | "extracting" | "review" | "error";

export default function AutoRfpPanel({ open, onClose, projectId, onApply }: AutoRfpPanelProps) {
    const [phase, setPhase] = useState<Phase>("input");
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<AutoRfpResponse | null>(null);
    const [excludedScreens, setExcludedScreens] = useState<Set<number>>(new Set());
    const [showDetails, setShowDetails] = useState<number | null>(null);

    // Input mode: workspace (from proposal) or direct text
    const [inputMode, setInputMode] = useState<"workspace" | "text">(projectId ? "workspace" : "text");
    const [directText, setDirectText] = useState("");
    const [workspaceSlug, setWorkspaceSlug] = useState("");

    const handleExtract = useCallback(async () => {
        setPhase("extracting");
        setError(null);
        setResult(null);
        setExcludedScreens(new Set());

        try {
            const body: any = {};
            if (inputMode === "workspace") {
                if (projectId) {
                    body.proposalId = projectId;
                } else if (workspaceSlug) {
                    body.workspaceSlug = workspaceSlug;
                } else {
                    throw new Error("No proposal or workspace specified");
                }
            } else {
                if (!directText.trim()) throw new Error("Paste RFP text to extract from");
                body.text = directText.trim();
            }

            const res = await fetch("/api/rfp/auto-response", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data: AutoRfpResponse = await res.json();

            if (!data.ok || !data.estimatorAnswers) {
                throw new Error(data.error || "Extraction returned no results");
            }

            if (!data.screens || data.screens.length === 0) {
                throw new Error("No screen requirements found in the RFP. The document may not contain LED display specifications.");
            }

            setResult(data);
            setPhase("review");
        } catch (err: any) {
            setError(err.message || "Extraction failed");
            setPhase("error");
        }
    }, [inputMode, projectId, workspaceSlug, directText]);

    const handleApply = useCallback(() => {
        if (!result?.estimatorAnswers) return;

        // Filter out excluded screens
        const filtered = { ...result.estimatorAnswers };
        filtered.displays = filtered.displays.filter((_, i) => !excludedScreens.has(i));

        onApply(filtered);
        onClose();
    }, [result, excludedScreens, onApply, onClose]);

    const toggleScreen = useCallback((idx: number) => {
        setExcludedScreens(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    }, []);

    if (!open) return null;

    const screens = result?.screens || [];
    const matchReport = result?.matchReport || [];
    const project = result?.project;
    const activeCount = (result?.estimatorAnswers?.displays.length || 0) - excludedScreens.size;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#0A52EF]" />
                    <h2 className="text-sm font-semibold">Auto-RFP Response</h2>
                </div>
                <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* ═══ INPUT PHASE ═══ */}
                {phase === "input" && (
                    <div className="p-4 space-y-4">
                        <p className="text-xs text-muted-foreground">
                            AI reads the RFP, extracts every screen requirement, matches products from the catalog,
                            and pre-fills the estimator. Review before accepting.
                        </p>

                        {/* Input mode tabs */}
                        <div className="flex gap-1 bg-muted/50 rounded p-0.5">
                            {projectId && (
                                <button
                                    onClick={() => setInputMode("workspace")}
                                    className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                        inputMode === "workspace"
                                            ? "bg-background shadow-sm text-foreground"
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    From This Project
                                </button>
                            )}
                            <button
                                onClick={() => setInputMode("workspace")}
                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                    inputMode === "workspace" && !projectId
                                        ? "bg-background shadow-sm text-foreground"
                                        : projectId ? "" : "text-muted-foreground hover:text-foreground"
                                }`}
                                style={{ display: projectId ? "none" : undefined }}
                            >
                                Workspace
                            </button>
                            <button
                                onClick={() => setInputMode("text")}
                                className={`flex-1 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                    inputMode === "text"
                                        ? "bg-background shadow-sm text-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                Paste Text
                            </button>
                        </div>

                        {inputMode === "workspace" && !projectId && (
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">
                                    AnythingLLM Workspace Slug
                                </label>
                                <input
                                    type="text"
                                    value={workspaceSlug}
                                    onChange={e => setWorkspaceSlug(e.target.value)}
                                    placeholder="e.g. ravens-stadium-rfp-abc123"
                                    className="w-full px-3 py-2 text-sm border border-border rounded bg-background focus:ring-1 focus:ring-[#0A52EF]/30 focus:border-[#0A52EF]/50 outline-none"
                                />
                            </div>
                        )}

                        {inputMode === "workspace" && projectId && (
                            <div className="bg-[#0A52EF]/5 border border-[#0A52EF]/15 rounded p-3">
                                <p className="text-xs text-[#0A52EF]">
                                    Will extract from the RFP documents embedded in this project&apos;s AnythingLLM workspace.
                                </p>
                            </div>
                        )}

                        {inputMode === "text" && (
                            <div>
                                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium block mb-1">
                                    Paste RFP Text (Division 11 / Display Schedule sections)
                                </label>
                                <textarea
                                    value={directText}
                                    onChange={e => setDirectText(e.target.value)}
                                    placeholder="Paste the relevant RFP sections here. Focus on Division 11, Display Schedule, or any sections listing LED display requirements..."
                                    rows={12}
                                    className="w-full px-3 py-2 text-xs font-mono border border-border rounded bg-background focus:ring-1 focus:ring-[#0A52EF]/30 focus:border-[#0A52EF]/50 outline-none resize-y"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                    {directText.length > 0 ? `${directText.length.toLocaleString()} characters` : ""}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={handleExtract}
                            disabled={inputMode === "text" && !directText.trim()}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0A52EF] text-white rounded text-sm font-medium hover:bg-[#0A52EF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileSearch className="w-4 h-4" />
                            Extract Screen Requirements
                        </button>
                    </div>
                )}

                {/* ═══ EXTRACTING PHASE ═══ */}
                {phase === "extracting" && (
                    <div className="p-8 flex flex-col items-center justify-center gap-4 text-center">
                        <div className="w-12 h-12 rounded-full border-2 border-[#0A52EF]/20 border-t-[#0A52EF] animate-spin" />
                        <div>
                            <p className="text-sm font-medium text-foreground">Analyzing RFP...</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                AI is reading the document, extracting screen requirements, and matching products.
                                This may take 15-30 seconds.
                            </p>
                        </div>
                    </div>
                )}

                {/* ═══ ERROR PHASE ═══ */}
                {phase === "error" && (
                    <div className="p-4 space-y-4">
                        <div className="bg-destructive/5 border border-destructive/20 rounded p-4">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-destructive">Extraction Failed</p>
                                    <p className="text-xs text-destructive/80 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setPhase("input")}
                            className="w-full px-4 py-2 border border-border rounded text-sm hover:bg-muted transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* ═══ REVIEW PHASE ═══ */}
                {phase === "review" && result && (
                    <div className="space-y-0">
                        {/* Project summary */}
                        {project && (
                            <div className="px-4 py-3 border-b border-border bg-muted/30">
                                <div className="flex items-center gap-4 text-xs">
                                    {project.clientName && (
                                        <span><strong className="text-foreground">{project.clientName}</strong></span>
                                    )}
                                    {project.venue && (
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                            <MapPin className="w-3 h-3" />
                                            {project.venue}
                                        </span>
                                    )}
                                    {project.location && (
                                        <span className="text-muted-foreground">{project.location}</span>
                                    )}
                                </div>
                                {project.projectName && (
                                    <p className="text-[10px] text-muted-foreground mt-1">{project.projectName}</p>
                                )}
                            </div>
                        )}

                        {/* Stats strip */}
                        <div className="px-4 py-2.5 border-b border-border flex items-center gap-4 text-xs">
                            <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <strong className="text-foreground">{screens.length}</strong> screens extracted
                            </span>
                            <span className="text-muted-foreground">
                                <strong className="text-foreground">{activeCount}</strong> selected
                            </span>
                            <span className="text-muted-foreground text-[10px]">
                                {result.extractionMethod === "ai-workspace" ? "From workspace" : "From text"}
                            </span>
                        </div>

                        {/* Screen list */}
                        <div className="divide-y divide-border">
                            {matchReport.map((match, idx) => {
                                const screen = screens.find(s =>
                                    match.screenName === s.name || match.screenName.startsWith(s.name)
                                ) || screens[Math.min(idx, screens.length - 1)];
                                const excluded = excludedScreens.has(idx);
                                const expanded = showDetails === idx;

                                return (
                                    <div
                                        key={idx}
                                        className={`transition-colors ${excluded ? "opacity-40" : ""}`}
                                    >
                                        <div className="flex items-center gap-3 px-4 py-2.5">
                                            {/* Checkbox */}
                                            <button
                                                onClick={() => toggleScreen(idx)}
                                                className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                    excluded
                                                        ? "border-border bg-muted"
                                                        : "border-[#0A52EF] bg-[#0A52EF] text-white"
                                                }`}
                                            >
                                                {!excluded && <Check className="w-3 h-3" />}
                                            </button>

                                            {/* Screen info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Monitor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="text-xs font-medium text-foreground truncate">
                                                        {match.screenName}
                                                    </span>
                                                    {screen?.confidence != null && (
                                                        <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                                                            screen.confidence >= 0.85
                                                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                                : screen.confidence >= 0.6
                                                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                                                : "bg-red-50 text-red-700 border border-red-200"
                                                        }`}>
                                                            {Math.round(screen.confidence * 100)}%
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-muted-foreground">
                                                    {screen && screen.widthFt > 0 && (
                                                        <span className="flex items-center gap-0.5">
                                                            <Ruler className="w-2.5 h-2.5" />
                                                            {screen.widthFt}&apos; × {screen.heightFt}&apos;
                                                        </span>
                                                    )}
                                                    {screen?.pixelPitchMm && (
                                                        <span>{screen.pixelPitchMm}mm</span>
                                                    )}
                                                    <span className="flex items-center gap-0.5">
                                                        <Cpu className="w-2.5 h-2.5" />
                                                        {match.matchedProductName}
                                                    </span>
                                                    {match.fitScore < 80 && (
                                                        <span className="text-amber-600">fit: {match.fitScore}%</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Expand */}
                                            <button
                                                onClick={() => setShowDetails(expanded ? null : idx)}
                                                className="p-1 text-muted-foreground hover:text-foreground rounded"
                                            >
                                                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>

                                        {/* Expanded details */}
                                        {expanded && screen && (
                                            <div className="px-4 pb-3 ml-8">
                                                <div className="grid grid-cols-2 gap-2 text-[10px]">
                                                    <div>
                                                        <span className="text-muted-foreground">Location: </span>
                                                        <span className="text-foreground">{screen.location || "—"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Environment: </span>
                                                        <span className="text-foreground">{screen.environment}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Brightness: </span>
                                                        <span className="text-foreground">{screen.brightness ? `${screen.brightness} nits` : "—"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Service: </span>
                                                        <span className="text-foreground">{screen.serviceType || "—"}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Matched Product: </span>
                                                        <span className="text-foreground font-mono">{match.matchedProductId}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Fit Score: </span>
                                                        <span className={`font-medium ${match.fitScore >= 80 ? "text-emerald-600" : match.fitScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                                                            {match.fitScore}%
                                                        </span>
                                                    </div>
                                                </div>
                                                {screen.notes && (
                                                    <p className="mt-1.5 text-[10px] text-muted-foreground italic">
                                                        {screen.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            {phase === "review" && (
                <div className="shrink-0 px-4 py-3 border-t border-border bg-background flex items-center justify-between">
                    <button
                        onClick={() => setPhase("input")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ← Re-extract
                    </button>
                    <button
                        onClick={handleApply}
                        disabled={activeCount === 0}
                        className="flex items-center gap-1.5 px-4 py-2 bg-[#0A52EF] text-white rounded text-xs font-medium hover:bg-[#0A52EF]/90 transition-colors disabled:opacity-50"
                    >
                        <Zap className="w-3.5 h-3.5" />
                        Apply {activeCount} Display{activeCount !== 1 ? "s" : ""} to Estimator
                    </button>
                </div>
            )}
        </div>
    );
}
