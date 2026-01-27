"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";
import AiCommandBar from "@/app/components/invoice/AiCommandBar";

interface StudioLayoutProps {
    /** Header content (Logo | Stepper | Actions) */
    header: React.ReactNode;
    /** Content for the Form */
    formContent: React.ReactNode;
    /** Content for the PDF Anchor (right pane) */
    pdfContent: React.ReactNode;
}

/**
 * StudioLayout - ANC Command Center
 * 
 * Features:
 * - Fixed 100vh viewport with no body scroll
 * - Left: Form content (top) + AI Command Bar (bottom)
 * - Right: PDF Preview (always visible)
 * - AI bar is persistent with 17/20 Gap Analysis
 */
export function StudioLayout({
    header,
    formContent,
    pdfContent,
}: StudioLayoutProps) {
    const [isAiExpanded, setIsAiExpanded] = useState(false);

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
                    {/* Form Content Area - Takes remaining space */}
                    <div 
                        className={cn(
                            "overflow-y-auto transition-all duration-300",
                            isAiExpanded ? "flex-[0.6]" : "flex-1"
                        )}
                    >
                        {formContent}
                    </div>

                    {/* AI Command Bar - Persistent with Gap Analysis */}
                    <div 
                        className={cn(
                            "border-t border-zinc-800 bg-zinc-950 transition-all duration-300 flex flex-col",
                            isAiExpanded ? "flex-[0.4] min-h-[250px]" : "h-12 shrink-0"
                        )}
                    >
                        <AiCommandBar 
                            isExpanded={isAiExpanded}
                            onToggle={() => setIsAiExpanded(!isAiExpanded)}
                        />
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
