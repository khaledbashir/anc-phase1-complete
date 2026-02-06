"use client";

import { cn } from "@/lib/utils";

export type InsightType = "market" | "warning" | "opportunity" | "strategic";

export type Insight = {
    type: InsightType;
    emoji: string;
    headline: string;
    text: string;
};

const ACCENT_COLORS: Record<InsightType, string> = {
    market: "border-l-[#0A52EF]",
    warning: "border-l-amber-500",
    opportunity: "border-l-emerald-500",
    strategic: "border-l-purple-500",
};

type InsightCardProps = {
    insight: Insight;
    visible: boolean;
    index: number;
};

export default function InsightCard({ insight, visible, index }: InsightCardProps) {
    if (!visible) return null;

    return (
        <div
            className={cn(
                "rounded-lg border border-border/50 border-l-[3px] bg-card/50 px-4 py-3.5",
                "hover:-translate-y-[1px] hover:shadow-md transition-all duration-200",
                ACCENT_COLORS[insight.type],
            )}
            style={{
                animation: "insight-slide-in 300ms ease-out forwards",
                animationDelay: `${index * 50}ms`,
            }}
        >
            <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5 shrink-0 leading-none" aria-hidden>
                    {insight.emoji}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-foreground leading-tight mb-1">
                        {insight.headline}
                    </div>
                    <div className="text-[13px] text-muted-foreground leading-relaxed">
                        {insight.text}
                    </div>
                </div>
            </div>
        </div>
    );
}
