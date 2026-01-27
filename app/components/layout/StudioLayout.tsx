"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import ModeToggle from "@/app/components/reusables/ModeToggle";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";

interface StudioLayoutProps {
    /** Header content (Logo | Stepper | Actions) */
    header: React.ReactNode;
    /** Content for Drafting Form mode */
    formContent: React.ReactNode;
    /** Content for Intelligence Engine mode */
    aiContent: React.ReactNode;
    /** Content for the PDF Anchor (right pane) */
    pdfContent: React.ReactNode;
}

/**
 * StudioLayout - ANC Studio 2-Pane Anchor System
 * 
 * Features:
 * - Fixed 100vh viewport with no body scroll
 * - Left 50%: The Hub (switchable Form/AI)
 * - Right 50%: The Anchor (PDF Preview, always visible)
 * - Zero-lag toggle via CSS opacity/pointer-events
 */
export function StudioLayout({
    header,
    formContent,
    aiContent,
    pdfContent,
}: StudioLayoutProps) {
    const [mode, setMode] = useState<"form" | "ai">("form");

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950">
            {/* Top Nav */}
            <header className="h-14 shrink-0 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-xl z-50">
                {header}
            </header>

            {/* Main Studio Area - 50/50 Grid */}
            <main className="flex-1 overflow-hidden grid grid-cols-2">
                {/* THE HUB (Left Pane) */}
                <section className="flex flex-col overflow-hidden bg-zinc-950 border-r border-zinc-800">
                    {/* Mode Toggle */}
                    <ModeToggle mode={mode} onChange={setMode} />

                    {/* Hub Content - Stacked Panels for Zero-Lag */}
                    <div className="flex-1 relative overflow-hidden">
                        {/* Form Panel */}
                        <div
                            className={cn(
                                "absolute inset-0 overflow-y-auto transition-opacity duration-150",
                                mode === "form" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                            )}
                        >
                            {formContent}
                        </div>

                        {/* AI Panel */}
                        <div
                            className={cn(
                                "absolute inset-0 overflow-y-auto transition-opacity duration-150",
                                mode === "ai" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                            )}
                        >
                            {aiContent}
                        </div>
                    </div>
                </section>

                {/* THE ANCHOR (Right Pane) - PDF Preview */}
                <section className="relative overflow-y-auto bg-slate-200 flex items-start justify-center p-12">
                    {/* Brand Signature Slashes in background */}
                    <BrandSlashes
                        className="absolute -top-20 -right-20 pointer-events-none"
                        width={400}
                        height={400}
                        opacity={0.07}
                        count={10}
                    />

                    <div className="relative z-10 w-full max-w-[650px] bg-white shadow-2xl rounded-sm">
                        {pdfContent}
                    </div>
                </section>
            </main>
        </div>
    );
}

export default StudioLayout;
