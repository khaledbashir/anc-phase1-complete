"use client";

import React from "react";
import { cn } from "@/lib/utils";

// Icons
import { PenLine, Bot } from "lucide-react";

type Mode = "form" | "ai";

interface ModeToggleProps {
    mode: Mode;
    onChange: (mode: Mode) => void;
    /** When false, only Drafting mode is shown (Intelligence hidden) */
    showIntelligence?: boolean;
}

/**
 * ModeToggle - Pill-style toggle for switching between Drafting Form and Intelligence Engine
 * 
 * Uses French Blue (#0A52EF) for active state
 * Zero-lag switching via parent state
 */
export function ModeToggle({ mode, onChange, isCollapsed = false, showIntelligence = true }: ModeToggleProps & { isCollapsed?: boolean }) {
    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    type="button"
                    onClick={() => onChange("form")}
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                        mode === "form" ? "bg-[#0A52EF] text-white shadow-lg shadow-brand-blue/20" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Drafting Mode"
                >
                    <PenLine className="w-4 h-4" />
                </button>
                {showIntelligence && (
                <button
                    type="button"
                    onClick={() => onChange("ai")}
                    className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                        mode === "ai" ? "bg-[#0A52EF] text-white shadow-lg shadow-brand-blue/20" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Intelligence Mode"
                >
                    <Bot className="w-4 h-4" />
                </button>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 p-1 bg-muted/40 rounded-xl border border-border/50">
            <button
                type="button"
                onClick={() => onChange("form")}
                className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    mode === "form"
                        ? "bg-[#0A52EF] text-white shadow-md shadow-brand-blue/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
                )}
            >
                <PenLine className="w-3.5 h-3.5" />
                Drafting
            </button>
            {showIntelligence && (
            <button
                type="button"
                onClick={() => onChange("ai")}
                className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    mode === "ai"
                        ? "bg-[#0A52EF] text-white shadow-md shadow-brand-blue/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/20"
                )}
            >
                <Bot className="w-3.5 h-3.5" />
                Intelligence
            </button>
            )}
        </div>
    );
}

export default ModeToggle;
