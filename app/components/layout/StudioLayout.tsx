"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";
import { LayoutDashboard, MessageSquare, Table, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import AiCommandBar from "@/app/components/proposal/AiCommandBar";

interface StudioLayoutProps {
    /** Header content (Logo | Stepper | Actions) */
    header: React.ReactNode;
    /** Content for the Form */
    formContent: React.ReactNode;
    /** Content for the AI Room */
    aiContent?: React.ReactNode;
    /** Content for the Audit View */
    auditContent?: React.ReactNode;
    /** Content for the PDF Anchor (right pane) */
    pdfContent: React.ReactNode;
}

export type ViewMode = "form" | "ai" | "audit";

/**
 * StudioLayout - ANC Command Center (V2 - Vertical Navigation)
 */
export function StudioLayout({
    header,
    formContent,
    aiContent,
    auditContent,
    pdfContent,
}: StudioLayoutProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("form");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isAiExpanded, setIsAiExpanded] = useState(false);

    const navItems = [
        { id: "form", icon: LayoutDashboard, label: "Proposal Builder" },
        { id: "ai", icon: MessageSquare, label: "Intelligence Engine" },
        { id: "audit", icon: Table, label: "Financial Audit" },
    ];

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-200">
            {/* Top Nav - Branding & Wizard Progress */}
            <header className="h-16 shrink-0 border-b border-zinc-900 bg-zinc-950 flex items-center px-4 z-50">
                {header}
            </header>

            <div className="flex-1 overflow-hidden flex">
                {/* 
                    VERTICAL CONTROL STRIP 
                    This is 'The Rail' - strictly for navigation 
                */}
                <aside
                    className={cn(
                        "border-r border-zinc-900 bg-zinc-950/50 flex flex-col transition-all duration-300 z-40",
                        isSidebarCollapsed ? "w-16" : "w-56"
                    )}
                >
                    <div className="flex-1 py-6 flex flex-col gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = viewMode === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setViewMode(item.id as ViewMode)}
                                    className={cn(
                                        "h-10 mx-2 px-3 rounded-lg flex items-center gap-3 transition-all group relative",
                                        isActive
                                            ? "bg-blue-600 text-white"
                                            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "group-hover:text-blue-400")} />
                                    {!isSidebarCollapsed && (
                                        <span className="text-sm font-medium truncate">{item.label}</span>
                                    )}
                                    {isActive && isSidebarCollapsed && (
                                        <div className="absolute right-0 w-1 h-6 bg-blue-500 rounded-l-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="h-14 border-t border-zinc-900 flex items-center justify-center text-zinc-600 hover:text-white transition-colors"
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </aside>

                {/* THE STUDIO GRID (50/50 Split) */}
                <main className="flex-1 overflow-hidden flex">
                    {/* THE HUB (Left Pane: 50vw) */}
                    <section className="w-1/2 flex flex-col overflow-hidden bg-zinc-950/40 border-r border-zinc-900">
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="h-full">
                                {viewMode === "form" && (
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 h-full">
                                        {formContent}
                                    </div>
                                )}

                                {viewMode === "ai" && (
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 h-full p-6">
                                        {aiContent || (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                                                <MessageSquare className="w-12 h-12 text-zinc-700 mb-4" />
                                                <h3 className="text-base font-semibold text-zinc-400">AI Context Initializing</h3>
                                                <p className="text-sm text-zinc-600 mt-2 max-w-xs">Connecting to AnythingLLM Strategic Node...</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {viewMode === "audit" && (
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-500 h-full p-6">
                                        {auditContent || (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-zinc-900/20 rounded-2xl border border-zinc-800 border-dashed">
                                                <Table className="w-12 h-12 text-zinc-700 mb-4" />
                                                <h3 className="text-base font-semibold text-zinc-400">No Audit Data</h3>
                                                <p className="text-sm text-zinc-600 mt-2 max-w-xs">Finalize your technical specifications to activate the Financial Audit.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Persistent AI Shortcut / Quick Bar */}
                        <div className="h-14 shrink-0 border-t border-zinc-900 bg-zinc-950/80 px-4 flex items-center">
                            <AiCommandBar
                                isExpanded={false}
                                onToggle={() => setViewMode("ai")}
                            />
                        </div>
                    </section>

                    {/* THE ANCHOR (Right Pane: 50vw) */}
                    <section className="w-1/2 relative bg-[#111] overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                            {/* Brand Signature Slashes in background */}
                            <BrandSlashes
                                className="absolute -top-20 -right-20 pointer-events-none transition-opacity duration-1000"
                                width={400}
                                height={400}
                                opacity={0.03}
                                count={8}
                            />

                            <div className="relative z-10 mx-auto w-full max-w-[850px] transform-gpu transition-all duration-500">
                                <div className="bg-white shadow-2xl rounded-md overflow-hidden border border-zinc-800">
                                    {pdfContent}
                                </div>
                            </div>
                        </div>

                        {/* Footer Status for PDF */}
                        <div className="h-9 border-t border-zinc-800 bg-zinc-900/60 backdrop-blur-sm flex items-center justify-between px-6 text-xs text-zinc-500">
                            <span>Live Preview</span>
                            <span className="text-zinc-600">PDF Engine</span>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default StudioLayout;
