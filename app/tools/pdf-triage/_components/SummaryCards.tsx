"use client";

import React from "react";
import { FileText, Files, Image as ImageIcon, Timer, CheckSquare } from "lucide-react";

interface SummaryCardsProps {
    filename: string;
    totalPages: number;
    textPages: number;
    drawingPages: number;
    processingTimeMs: number;
    selectedCount: number;
}

export default function SummaryCards({
    filename,
    totalPages,
    textPages,
    drawingPages,
    processingTimeMs,
    selectedCount
}: SummaryCardsProps) {
    const processingSeconds = (processingTimeMs / 1000).toFixed(1);

    const cards = [
        {
            label: "Total Pages",
            value: totalPages.toLocaleString(),
            icon: Files,
            color: "text-blue-500",
            bg: "bg-blue-500/10"
        },
        {
            label: "Text Pages",
            value: textPages.toLocaleString(),
            icon: FileText,
            color: "text-indigo-500",
            bg: "bg-indigo-500/10"
        },
        {
            label: "Drawings",
            value: drawingPages.toLocaleString(),
            icon: ImageIcon,
            color: "text-cyan-500",
            bg: "bg-cyan-500/10"
        },
        {
            label: "Processing Time",
            value: `${processingSeconds}s`,
            icon: Timer,
            color: "text-amber-500",
            bg: "bg-amber-500/10"
        },
        {
            label: "Selected Pages",
            value: selectedCount.toLocaleString(),
            icon: CheckSquare,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10"
        }
    ];

    return (
        <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-3 truncate" title={filename}>
                Results for {filename}
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((card, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${card.bg}`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                            <p className="text-2xl font-bold text-foreground mt-0.5">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
