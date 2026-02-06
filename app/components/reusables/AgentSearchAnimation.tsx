"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type AgentSearchPhase = "idle" | "searching" | "filling" | "complete" | "error";

type AgentSearchAnimationProps = {
    phase: AgentSearchPhase;
    children: React.ReactNode;
    className?: string;
};

const SEARCH_MESSAGES = [
    "Searching databases\u2026",
    "Cross-referencing records\u2026",
    "Verifying address details\u2026",
    "Compiling results\u2026",
];

export default function AgentSearchAnimation({
    phase,
    children,
    className,
}: AgentSearchAnimationProps) {
    const [messageIndex, setMessageIndex] = useState(0);
    const [sparkles, setSparkles] = useState<{ id: number; x: number; y: number }[]>([]);

    // Cycle status messages during search
    useEffect(() => {
        if (phase !== "searching") {
            setMessageIndex(0);
            return;
        }
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % SEARCH_MESSAGES.length);
        }, 2200);
        return () => clearInterval(interval);
    }, [phase]);

    // Spawn sparkles on completion
    useEffect(() => {
        if (phase !== "complete") {
            setSparkles([]);
            return;
        }
        const s = Array.from({ length: 8 }, (_, i) => ({
            id: i,
            x: 10 + Math.random() * 80,
            y: 5 + Math.random() * 90,
        }));
        setSparkles(s);
    }, [phase]);

    const isActive = phase !== "idle";

    // Border style per phase
    const borderStyle: React.CSSProperties | undefined = (() => {
        switch (phase) {
            case "searching":
                return {
                    background:
                        "linear-gradient(90deg, #0A52EF, #60a5fa, #818cf8, #0A52EF)",
                    backgroundSize: "300% 100%",
                    animation: "agent-border-glow 2s linear infinite",
                };
            case "filling":
                return {
                    background:
                        "linear-gradient(90deg, #0A52EF, #22c55e, #60a5fa, #0A52EF)",
                    backgroundSize: "300% 100%",
                    animation: "agent-border-glow 1.5s linear infinite",
                };
            case "complete":
                return {
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    animation: "agent-success-pulse 1s ease-in-out 3",
                };
            case "error":
                return {
                    background: "#71717a",
                    transition: "background 0.5s ease",
                };
            default:
                return undefined;
        }
    })();

    if (!isActive) {
        return (
            <div className={cn("rounded-xl border border-border", className)}>
                {children}
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Animated gradient border wrapper */}
            <div
                className="rounded-xl p-[2px] transition-all duration-300"
                style={borderStyle}
            >
                <div className={cn("rounded-[10px]", className)}>{children}</div>
            </div>

            {/* Status text */}
            {phase === "searching" && (
                <div className="mt-2 flex items-center gap-2 px-2 h-5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#0A52EF] animate-pulse shrink-0" />
                    <span
                        key={messageIndex}
                        className="text-xs text-[#0A52EF] font-medium"
                        style={{ animation: "agent-status-fade 2.2s ease-in-out" }}
                    >
                        {SEARCH_MESSAGES[messageIndex]}
                    </span>
                </div>
            )}

            {phase === "filling" && (
                <div className="mt-2 flex items-center gap-2 px-2 h-5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-200">
                        Populating fields&hellip;
                    </span>
                </div>
            )}

            {phase === "complete" && (
                <div className="mt-2 flex items-center gap-2 px-2 h-5">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-300">
                        Client information found
                    </span>
                </div>
            )}

            {phase === "error" && (
                <div className="mt-2 flex items-center gap-2 px-2 h-5">
                    <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 shrink-0" />
                    <span className="text-xs text-zinc-500 font-medium animate-in fade-in duration-300">
                        No results found
                    </span>
                </div>
            )}

            {/* Sparkle particles */}
            {phase === "complete" &&
                sparkles.map((s) => (
                    <div
                        key={s.id}
                        className="absolute pointer-events-none"
                        style={{
                            left: `${s.x}%`,
                            top: `${s.y}%`,
                            animation: `agent-sparkle ${0.5 + Math.random() * 0.5}s ease-out ${s.id * 0.08}s forwards`,
                        }}
                    >
                        <svg
                            width="10"
                            height="10"
                            viewBox="0 0 10 10"
                            className="text-amber-400"
                        >
                            <path
                                d="M5 0L6 4L10 5L6 6L5 10L4 6L0 5L4 4Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                ))}
        </div>
    );
}
