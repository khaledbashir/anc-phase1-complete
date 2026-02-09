"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import InsightCard, { type Insight } from "./InsightCard";

type BriefData = {
    clientSummary: string;
    insights: Insight[];
    bottomLine: string;
    generatedAt?: string;
};

type BriefMePanelProps = {
    open: boolean;
    onClose: () => void;
    proposalId: string | undefined;
    clientName: string;
    address: string;
    screenCount: number;
    totalAmount: number;
    screenSummary: string[];
    onBriefLoaded?: (hasBrief: boolean) => void;
};

const LOADING_MESSAGES = [
    "Reading project data\u2026",
    "Researching {client}\u2026",
    "Scanning recent developments\u2026",
    "Analyzing project scope\u2026",
    "Connecting the dots\u2026",
];

const INSIGHT_DELAYS = [800, 2000, 3200, 4400, 5600, 6800];
const BOTTOM_LINE_DELAY = 8500;

function TypingDots() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-3 h-8">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
                    style={{
                        animation: "typing-dot 1.2s ease-in-out infinite",
                        animationDelay: `${i * 200}ms`,
                    }}
                />
            ))}
        </div>
    );
}

export default function BriefMePanel({
    open,
    onClose,
    proposalId,
    clientName,
    address,
    screenCount,
    totalAmount,
    screenSummary,
    onBriefLoaded,
}: BriefMePanelProps) {
    const [brief, setBrief] = useState<BriefData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isFirstReveal, setIsFirstReveal] = useState(true);
    const [visibleInsights, setVisibleInsights] = useState(0);
    const [showBottomLine, setShowBottomLine] = useState(false);
    const [showTypingDots, setShowTypingDots] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);
    
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);
    const [loadingFadingOut, setLoadingFadingOut] = useState(false);
    const revealTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const hasFetchedRef = useRef(false);

    const clearTimers = useCallback(() => {
        revealTimersRef.current.forEach(clearTimeout);
        revealTimersRef.current = [];
    }, []);

    const startSequentialReveal = useCallback((data: BriefData) => {
        clearTimers();
        setVisibleInsights(0);
        setShowBottomLine(false);
        setShowTypingDots(false);
        setIsFirstReveal(true);

        const insightCount = data.insights.length;

        data.insights.forEach((_, i) => {
            // Show typing dots before each card (except first)
            if (i > 0) {
                const dotsTimer = setTimeout(() => setShowTypingDots(true), INSIGHT_DELAYS[i] - 600);
                revealTimersRef.current.push(dotsTimer);
            }

            const timer = setTimeout(() => {
                setShowTypingDots(false);
                setVisibleInsights(i + 1);

                // Show typing dots after this card if not the last
                if (i < insightCount - 1) {
                    const afterTimer = setTimeout(() => setShowTypingDots(true), 200);
                    revealTimersRef.current.push(afterTimer);
                }
            }, INSIGHT_DELAYS[i] || INSIGHT_DELAYS[INSIGHT_DELAYS.length - 1] + (i - INSIGHT_DELAYS.length + 1) * 1200);
            revealTimersRef.current.push(timer);
        });

        // Bottom line
        const blDelay = insightCount <= INSIGHT_DELAYS.length
            ? BOTTOM_LINE_DELAY
            : INSIGHT_DELAYS[INSIGHT_DELAYS.length - 1] + (insightCount - INSIGHT_DELAYS.length + 1) * 1200 + 1700;

        const blDotsTimer = setTimeout(() => setShowTypingDots(true), blDelay - 600);
        revealTimersRef.current.push(blDotsTimer);

        const blTimer = setTimeout(() => {
            setShowTypingDots(false);
            setShowBottomLine(true);
            setIsFirstReveal(false);
        }, blDelay);
        revealTimersRef.current.push(blTimer);
    }, [clearTimers]);

    const fetchBrief = useCallback(async (refresh = false) => {
        if (!proposalId || proposalId === "new" || !clientName) return;

        setLoading(true);
        setError(null);
        setLoadingMessages([]);
        setLoadingFadingOut(false);
        setBrief(null);
        setVisibleInsights(0);
        setShowBottomLine(false);
        setShowTypingDots(false);

        // Start cycling loading messages
        const msgTimers: ReturnType<typeof setTimeout>[] = [];
        LOADING_MESSAGES.forEach((msg, i) => {
            const t = setTimeout(() => {
                const resolvedMsg = msg.replace("{client}", clientName || "client");
                setLoadingMessages((prev) => [...prev, resolvedMsg]);
            }, i * 1500);
            msgTimers.push(t);
        });

        try {
            const res = await fetch("/api/agent/intelligence-brief", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(refresh ? { "x-refresh": "true" } : {}),
                },
                body: JSON.stringify({
                    clientName,
                    address,
                    screenCount,
                    totalAmount,
                    screenSummary,
                    proposalId,
                }),
            });

            msgTimers.forEach(clearTimeout);

            if (!res.ok) {
                const data = await res.json().catch(() => null);
                throw new Error(data?.error || "Failed to generate brief");
            }

            const data = await res.json();
            if (!data?.brief) throw new Error("No brief data received");

            const briefData = data.brief as BriefData;
            const wasCached = data.cached === true;

            // Fade out loading messages
            setLoadingFadingOut(true);
            await new Promise((r) => setTimeout(r, 300));

            setBrief(briefData);
            setLoading(false);
            onBriefLoaded?.(true);

            if (wasCached || !refresh) {
                if (wasCached) {
                    // Cached: show everything instantly
                    setIsFirstReveal(false);
                    setVisibleInsights(briefData.insights.length);
                    setShowBottomLine(true);
                } else {
                    // First load: sequential reveal
                    startSequentialReveal(briefData);
                }
            } else {
                // Refresh: replay reveal
                startSequentialReveal(briefData);
            }
        } catch (err) {
            msgTimers.forEach(clearTimeout);
            setLoading(false);
            setError(err instanceof Error ? err.message : "Something went wrong");
        }
    }, [proposalId, clientName, address, screenCount, totalAmount, screenSummary, onBriefLoaded, startSequentialReveal]);

    // Fetch on first open
    useEffect(() => {
        if (open && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchBrief();
        }
    }, [open, fetchBrief]);

    // Cleanup on unmount
    useEffect(() => () => clearTimers(), [clearTimers]);

    // Reset hasFetched when proposalId changes
    useEffect(() => {
        hasFetchedRef.current = false;
        setBrief(null);
    }, [proposalId]);

    if (!open || !mounted) return null;

    const panelContent = (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 z-40 md:bg-transparent"
                onClick={onClose}
            />

            {/* Panel */}
            <div
                className={cn(
                    "fixed top-0 right-0 h-full z-50 bg-white dark:bg-background border-l border-border",
                    "shadow-[-8px_0_30px_rgba(0,0,0,0.12)]",
                    "w-full md:w-[420px]",
                    "animate-in slide-in-from-right duration-300",
                    "flex flex-col",
                )}
            >
                {/* Header */}
                <div className="shrink-0 px-5 py-4 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#0A52EF]" />
                        <h2 className="text-sm font-bold text-foreground">Project Intelligence</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        {brief && (
                            <button
                                type="button"
                                onClick={() => {
                                    clearTimers();
                                    fetchBrief(true);
                                }}
                                disabled={loading}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                title="Refresh intelligence brief"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                    {/* ZONE 1 — Client Summary */}
                    {(brief || clientName) && (
                        <div
                            className="rounded-xl bg-slate-800 dark:bg-slate-900 px-4 py-4"
                            style={{ animation: "insight-fade-in 400ms ease-out forwards" }}
                        >
                            <div className="text-base font-bold text-white leading-tight">
                                {clientName || "Client"}
                            </div>
                            {brief?.clientSummary && (
                                <div className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {brief.clientSummary}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Loading State — Stacked Status Messages */}
                    {loading && (
                        <div
                            className={cn(
                                "space-y-1 transition-opacity duration-300",
                                loadingFadingOut && "opacity-0",
                            )}
                        >
                            {loadingMessages.map((msg, i) => {
                                const isLast = i === loadingMessages.length - 1;
                                const total = loadingMessages.length;
                                // Opacity: earlier messages are more faded
                                const opacity = total <= 1
                                    ? 1
                                    : 0.35 + (i / (total - 1)) * 0.65;

                                return (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 px-1"
                                        style={{
                                            opacity,
                                            animation: "insight-fade-in 400ms ease-out forwards",
                                        }}
                                    >
                                        {isLast && (
                                            <div className="h-1.5 w-1.5 rounded-full bg-[#0A52EF] animate-pulse shrink-0" />
                                        )}
                                        <span className={cn(
                                            "text-xs font-medium",
                                            isLast ? "text-[#0A52EF]" : "text-muted-foreground",
                                        )}>
                                            {msg}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                            <div className="text-xs text-red-400 font-medium">{error}</div>
                            <button
                                type="button"
                                onClick={() => fetchBrief(true)}
                                className="mt-2 text-[11px] text-red-400 underline hover:text-red-300"
                            >
                                Try again
                            </button>
                        </div>
                    )}

                    {/* ZONE 2 — Insights */}
                    {brief && (
                        <div className="space-y-3">
                            {brief.insights.map((insight, i) => (
                                <InsightCard
                                    key={`${insight.headline}-${i}`}
                                    insight={insight}
                                    visible={!isFirstReveal || i < visibleInsights}
                                    index={i}
                                />
                            ))}

                            {/* Typing dots between insights */}
                            {isFirstReveal && showTypingDots && !showBottomLine && <TypingDots />}
                        </div>
                    )}

                    {/* ZONE 3 — Bottom Line */}
                    {brief?.bottomLine && (!isFirstReveal || showBottomLine) && (
                        <div
                            className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/50 dark:border-blue-800/30 px-5 py-5 mt-2"
                            style={{
                                animation: "insight-bottom-line 400ms ease-out forwards",
                            }}
                        >
                            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-2">
                                The Bottom Line
                            </div>
                            <div className="text-[15px] font-medium text-foreground leading-relaxed">
                                {brief.bottomLine}
                            </div>
                        </div>
                    )}

                    {/* Generated timestamp */}
                    {brief?.generatedAt && !loading && !isFirstReveal && (
                        <div className="text-[10px] text-muted-foreground text-center pt-2">
                            Generated {new Date(brief.generatedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
    
    return createPortal(panelContent, document.body);
}
