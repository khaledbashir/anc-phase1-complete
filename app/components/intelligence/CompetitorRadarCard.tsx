"use client";

import React, { useState } from "react";
import { Radar, Target, ShieldAlert, Zap, BookOpen, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { CompetitorAnalysisResult, CompetitorSignal } from "@/app/services/CompetitorIntelligenceService";

interface CompetitorRadarCardProps {
    analysis: CompetitorAnalysisResult | null;
    isLoading: boolean;
    onAnalyze: () => void;
}

export default function CompetitorRadarCard({ analysis, isLoading, onAnalyze }: CompetitorRadarCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    if (!analysis && !isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                    <Radar size={24} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Competitor Radar Off</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                    Enable forensic analysis to detect "wired" RFP specs and hidden competitor traps.
                </p>
                <button
                    onClick={onAnalyze}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                >
                    <Radar size={16} />
                    Initialize Radar Scan
                </button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Target size={20} className="text-primary/50" />
                    </div>
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">Running Forensic Analysis...</p>
                <p className="text-xs text-muted-foreground animate-pulse mt-1">Scanning for voltage traps & wired specs</p>
            </div>
        );
    }

    if (!analysis) return null;

    const riskColor =
        analysis.riskLevel === "CRITICAL" ? "text-red-500 bg-red-500/10 border-red-500/20" :
            analysis.riskLevel === "HIGH" ? "text-orange-500 bg-orange-500/10 border-orange-500/20" :
                analysis.riskLevel === "MODERATE" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
                    "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";

    const RiskIcon =
        analysis.riskLevel === "CRITICAL" ? ShieldAlert :
            analysis.riskLevel === "HIGH" ? AlertTriangle :
                analysis.riskLevel === "MODERATE" ? Zap :
                    CheckCircle;

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div
                className="p-4 border-b border-border bg-muted/20 flex items-center justify-between cursor-pointer hover:bg-muted/40 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${riskColor}`}>
                        <RiskIcon size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-foreground uppercase tracking-wide">Competitor Radar</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${riskColor}`}>
                                {analysis.riskLevel} Risk
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {analysis.primaryCompetitor ? `Detected: ${analysis.primaryCompetitor}` : "No clear competitor fingerprint"}
                        </p>
                    </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="p-0">
                    {/* Executive Summary */}
                    <div className="p-5 border-b border-border/50">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                            <BookOpen size={12} /> Forensic Summary
                        </h4>
                        <p className="text-sm text-foreground leading-relaxed font-medium">
                            {analysis.executiveSummary}
                        </p>
                    </div>

                    {/* Signals List */}
                    <div className="divide-y divide-border/50">
                        {analysis.signals.map((signal, idx) => (
                            <div key={idx} className="p-5 hover:bg-muted/10 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary ring-2 ring-primary/20"></div>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <h5 className="font-semibold text-sm text-foreground">
                                                    Signal: "{signal.signal}"
                                                </h5>
                                                {signal.confidence === "HIGH" && (
                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                                        HIGH CONFIDENCE
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-semibold text-foreground/80">Implication:</span> {signal.implication}
                                            </p>
                                        </div>

                                        {/* Counter-Script Box */}
                                        <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-lg p-3">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Zap size={12} className="text-blue-600 dark:text-blue-400" />
                                                <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider">
                                                    Counter-Script
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium text-foreground/90 italic">
                                                "{signal.counterArgument}"
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {analysis.signals.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                <CheckCircle size={32} className="mx-auto text-emerald-500/50 mb-3" />
                                <p className="text-sm font-medium">Clean RFP Detected</p>
                                <p className="text-xs mt-1">No major competitor "tells" found in the scanned text.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
