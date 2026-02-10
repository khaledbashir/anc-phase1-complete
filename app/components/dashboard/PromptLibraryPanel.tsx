"use client";

import React, { useState, useCallback } from "react";
import { BookOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import PromptLibrary from "./PromptLibrary";

interface PromptLibraryPanelProps {
    pipelineContext?: string;
    onSendToCopilot?: (message: string) => Promise<string>;
}

/**
 * Slide-out panel wrapper for the Prompt Library.
 * Renders a toggle button (fixed position) and the panel itself.
 */
export default function PromptLibraryPanel({
    pipelineContext,
    onSendToCopilot,
}: PromptLibraryPanelProps) {
    const [isOpen, setIsOpen] = useState(false);

    const handleSendToCopilot = useCallback(
        (prompt: string, userInput: string) => {
            const fullMessage = userInput?.trim()
                ? `${prompt}\n\n${userInput.trim()}`
                : prompt;
            onSendToCopilot?.(fullMessage);
            setIsOpen(false);
        },
        [onSendToCopilot]
    );

    return (
        <>
            {/* Toggle Button — positioned above the copilot button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-24 right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-white shadow-xl hover:scale-105 transition-all border border-white/20"
                    style={{ backgroundColor: "#1e293b" }}
                    title="AI Operations Prompt Library"
                >
                    <BookOpen className="w-4 h-4" />
                    <span className="text-xs font-semibold tracking-wide">AI Ops</span>
                </button>
            )}

            {/* Slide-out Panel */}
            <div
                className={cn(
                    "fixed top-0 left-0 z-[60] h-full w-[380px] max-w-[85vw] bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 flex flex-col transition-transform duration-300 ease-out",
                    isOpen ? "translate-x-16 md:translate-x-20" : "-translate-x-full"
                )}
                style={{
                    boxShadow: isOpen ? "8px 0 30px rgba(0,0,0,0.12)" : "none",
                }}
            >
                {/* Close button */}
                <button
                    onClick={() => setIsOpen(false)}
                    className="absolute top-3 right-3 p-1.5 rounded-md text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <PromptLibrary
                    onSendToCopilot={handleSendToCopilot}
                    pipelineContext={pipelineContext}
                    className="h-full"
                />
            </div>

            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[55] bg-black/20 backdrop-blur-[1px]"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </>
    );
}
