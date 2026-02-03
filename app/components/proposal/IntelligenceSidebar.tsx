"use client";

import React from "react";
import { useFormContext, useWatch } from "react-hook-form";
import {
    CheckCircle2,
    X,
    AlertTriangle,
    Zap,
    Target,
    Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { analyzeGaps, calculateCompletionRate } from "@/lib/gap-analysis";
import { useProposalContext } from "@/contexts/ProposalContext";

export function IntelligenceSidebar({ isVisible, onToggle }: { isVisible: boolean; onToggle: () => void }) {
    const { control } = useFormContext();
    const formValues = useWatch({ control });
    const { risks } = useProposalContext();

    const gaps = analyzeGaps(formValues);
    const completionRate = calculateCompletionRate(gaps.length);

    const isDefaultClient = !formValues?.receiver?.name || formValues?.receiver?.name === "Client Name";
    const isNoScreens = (formValues?.details?.screens || []).length === 0;
    const isNoProjectName = !formValues?.details?.proposalName;
    const isEmptyState = isDefaultClient && isNoScreens && isNoProjectName;

    if (!isVisible) {
        return (
            <button
                onClick={onToggle}
                className="group absolute right-4 top-24 z-50 p-3 bg-muted border border-border rounded-full shadow-2xl hover:bg-accent transition-all animate-in fade-in zoom-in duration-300"
                title="Show Gaps Panel"
            >
                <div className="relative">
                    <Zap className="w-5 h-5 text-[#0A52EF]" />
                    {gaps.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-900" />
                    )}
                </div>
            </button>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background border-l border-border w-96 shrink-0 overflow-hidden animate-in slide-in-from-right duration-300 shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-[#0A52EF]/10 rounded-lg flex items-center justify-center">
                            <Zap className="w-4 h-4 text-[#0A52EF]" />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">Gaps & Risks</h3>
                    </div>
                    <button
                        onClick={onToggle}
                        className="p-1.5 hover:bg-accent rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                    {/* Vitality Score */}
                    <div className="p-4 border border-border rounded-xl bg-card/50">
                        <div className="flex items-end justify-between mb-3">
                            <div>
                                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Bid Health</div>
                                <div className={cn(
                                    "text-3xl font-black",
                                    completionRate >= 85 ? "text-emerald-500" : completionRate >= 50 ? "text-amber-500" : "text-zinc-600"
                                )}>
                                    {Math.round(completionRate)}<span className="text-lg text-zinc-500">%</span>
                                </div>
                            </div>
                            <div className={cn(
                                "text-[10px] font-bold px-2 py-1 rounded uppercase",
                                completionRate >= 85 ? "bg-emerald-500/10 text-emerald-500" : completionRate >= 50 ? "bg-amber-500/10 text-amber-500" : "bg-zinc-800 text-zinc-500"
                            )}>
                                {completionRate >= 85 ? "Ready" : completionRate >= 50 ? "Needs Work" : "Critical"}
                            </div>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full transition-all duration-1000",
                                    completionRate >= 85 ? "bg-emerald-500" : completionRate >= 50 ? "bg-amber-500" : "bg-muted-foreground"
                                )}
                                style={{ width: `${completionRate}%` }}
                            />
                        </div>
                    </div>

                    {/* Risks */}
                    {risks && risks.length > 0 && (
                        <div className="border border-red-500/20 rounded-xl bg-red-950/10 p-4">
                            <h4 className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <AlertTriangle className="w-3 h-3" />
                                Critical Risks
                            </h4>
                            <div className="space-y-2">
                                {risks.map(r => (
                                    <div key={r.id} className="bg-red-900/20 rounded-lg p-3 border border-red-500/10 text-xs">
                                        <div className="font-bold text-red-200 mb-1">{r.risk}</div>
                                        <div className="text-red-300/70 text-[10px]">{r.actionRequired}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Gaps */}
                    <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            Gaps ({gaps.length})
                        </h4>
                        {gaps.length > 0 ? gaps.map(gap => (
                            <div
                                key={gap.id}
                                className={cn(
                                    "p-4 rounded-xl border transition-all",
                                    gap.priority === "high"
                                        ? "bg-red-500/10 border-red-500/20"
                                        : "bg-card/30 border-border"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        "mt-1 p-1.5 rounded-md",
                                        gap.priority === "high" ? "bg-red-500/20 text-red-500" : "bg-amber-500/20 text-amber-500"
                                    )}>
                                        <Target className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-bold text-foreground mb-1">{gap.field}</div>
                                        <p className="text-[11px] text-muted-foreground">{gap.description}</p>
                                    </div>
                                </div>
                            </div>
                        )) : !isEmptyState && (
                            <div className="p-6 border border-emerald-500/20 rounded-xl bg-emerald-500/10 text-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                <div className="text-sm font-bold text-foreground mb-1">All Systems Nominal</div>
                                <p className="text-xs text-muted-foreground">Ready for export</p>
                            </div>
                        )}

                        {isEmptyState && (
                            <div className="p-6 border border-dashed border-border rounded-xl text-center">
                                <Info className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                <p className="text-xs text-muted-foreground">Waiting for RFP data...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
    );
}
