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
        { id: "audit", icon: Table, label: "Financial Audit" },
    ];

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-200">
            {/* Top Nav - Branding & Wizard Progress */}
            <header className="h-14 shrink-0 border-b border-zinc-800/50 bg-zinc-950/95 backdrop-blur-xl z-50">
                {header}
            </header>

            <div className="flex-1 overflow-hidden flex">
                {/* VERTICAL SIDEBAR (The Control Strip) */}
                <aside
                    className={cn(
                        "border-r border-zinc-800/50 bg-zinc-950/80 group flex flex-col transition-all duration-300",
                        isSidebarCollapsed ? "w-14" : "w-48"
                    )}
                >
                    <div className="flex-1 py-4 flex flex-col gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = viewMode === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setViewMode(item.id as ViewMode)}
                                    className={cn(
                                        "h-10 mx-2 px-2 rounded-lg flex items-center gap-3 transition-all",
                                        isActive
                                            ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                                            : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
                                    )}
                                >
                                    <Icon className="w-5 h-5 shrink-0" />
                                    {!isSidebarCollapsed && (
                                        <span className="text-sm font-medium truncate">{item.label}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="h-12 border-t border-zinc-800/50 flex items-center justify-center text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                    </button>
                </aside>

                {/* Main Studio Area - Left Pane Content + Right PDF Anchor */}
                <main className="flex-1 overflow-hidden grid grid-cols-2">
                    {/* THE HUB (Left Pane) */}
                    <section className="flex flex-col overflow-hidden bg-zinc-950 border-r border-zinc-800/50">
                        {/* Dynamic Content Area */}
                        <div className="flex-1 overflow-y-auto">
                            {viewMode === "form" && (
                                <div className="animate-in fade-in duration-300 h-full">
                                    {formContent}
                                </div>
                            )}

                            {viewMode === "audit" && (
                                <div className="animate-in slide-in-from-bottom-4 duration-300 h-full p-4 overflow-auto">
                                    {auditContent || (
                                        <div className="border border-zinc-800/50 rounded-xl bg-zinc-900/20 p-8 text-center text-zinc-500">
                                            No audit data available for this project state.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Persistent AI Command Bar (Optional shortcut/status) */}
                        <div
                            className={cn(
                                "border-t border-zinc-800/50 bg-zinc-950 transition-all duration-300 flex flex-col",
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
                    <section className="relative overflow-y-auto bg-zinc-900 flex items-start justify-center p-8">
                        {/* Brand Signature Slashes in background */}
                        <BrandSlashes
                            className="absolute -top-20 -right-20 pointer-events-none"
                            width={400}
                            height={400}
                            opacity={0.03}
                            count={10}
                        />

                        <div className="relative z-10 w-full max-w-[750px] bg-white shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden border border-zinc-800/10">
                            {pdfContent}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default StudioLayout;
