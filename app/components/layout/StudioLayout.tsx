"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/lib/featureFlags";
import { BrandSlashes } from "@/app/components/reusables/BrandGraphics";
import { LayoutDashboard, MessageSquare, Table, PanelLeftClose, PanelLeftOpen, Folder } from "lucide-react";
import ModeToggle from "@/app/components/reusables/ModeToggle";
import { IntelligenceSidebar } from "@/app/components/proposal/IntelligenceSidebar";

interface StudioLayoutProps {
    /** Header content (Logo | Stepper | Actions) */
    header: React.ReactNode;
    /** Content for the Form */
    formContent: React.ReactNode;
    /** Content for the AI Room */
    aiContent?: React.ReactNode;
    /** Content for the Audit View */
    auditContent?: React.ReactNode;
    /** Hide audit navigation and panel */
    showAudit?: boolean;
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
    showAudit = true,
}: StudioLayoutProps) {
    const [viewMode, setViewMode] = useState<ViewMode>("form");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
    const [isHealthSidebarVisible, setIsHealthSidebarVisible] = useState(false);

    // When Intelligence mode is disabled, stay on form if user was on ai
    useEffect(() => {
        if (!FEATURES.INTELLIGENCE_MODE && viewMode === "ai") setViewMode("form");
    }, [viewMode]);

    useEffect(() => {
        if (!showAudit && viewMode === "audit") setViewMode("form");
    }, [showAudit, viewMode]);

    const navItems = [
        { id: "form", icon: LayoutDashboard, label: "Edit Proposal" },
        ...(showAudit ? [{ id: "audit", icon: Table, label: "Pricing Breakdown" }] : []),
    ];

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-background text-foreground">
            {/* Top Nav - Branding & Wizard Progress */}
            <header className="h-20 shrink-0 border-b border-border bg-background/80 backdrop-blur-md flex flex-col z-50">
                {header}
            </header>

            <div className="flex-1 overflow-hidden flex">
                {/* 
                    VERTICAL CONTROL STRIP 
                    This is 'The Rail' - strictly for navigation 
                */}
                <aside
                    className={cn(
                        "border-r border-border bg-background/80 backdrop-blur-md flex flex-col transition-all duration-300 z-40",
                        isSidebarCollapsed ? "w-16" : "w-56"
                    )}
                >
                    <div className="p-3 border-b border-border">
                        <ModeToggle
                            mode={viewMode === "ai" ? "ai" : "form"}
                            onChange={(m) => setViewMode(m as ViewMode)}
                            isCollapsed={isSidebarCollapsed}
                            showIntelligence={FEATURES.INTELLIGENCE_MODE}
                        />
                    </div>
                    <div className="flex-1 py-4 flex flex-col gap-2">
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
                                            ? "bg-brand-blue text-white shadow-lg shadow-brand-blue/20"
                                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                    )}
                                >
                                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "group-hover:text-brand-blue")} />
                                    {!isSidebarCollapsed && (
                                        <span className="text-sm font-medium truncate">{item.label}</span>
                                    )}
                                    {isActive && isSidebarCollapsed && (
                                        <div className="absolute right-0 w-1 h-6 bg-brand-blue rounded-l-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="px-2 pb-4">
                        <Link
                            href="/projects"
                            className={cn(
                                "h-10 px-3 rounded-lg flex items-center gap-3 transition-all group",
                                "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                        >
                            <Folder className="w-4 h-4 shrink-0 group-hover:text-brand-blue" />
                            {!isSidebarCollapsed && (
                                <span className="text-sm font-medium truncate">Projects</span>
                            )}
                        </Link>
                    </div>

                    {/* Collapse Toggle */}
                    <button
                        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        className="h-14 border-t border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
                    </button>
                </aside>

                {/* THE STUDIO GRID (50/50 Split) */}
                <main className="flex-1 overflow-hidden grid grid-cols-2">
                    {/* THE HUB (Left Pane: 50vw) */}
                    <section className="relative flex flex-col overflow-hidden bg-background/40 border-r border-border anc-slash-bg">
                        {/* Stacked Panels with CSS Visibility Toggle */}
                        <div className="flex-1 flex overflow-hidden">
                            <div className="flex-1 relative overflow-hidden">
                                {/* Drafting Form Panel */}
                                <div
                                    className={cn(
                                        "absolute inset-0 overflow-y-auto custom-scrollbar transition-opacity duration-300",
                                        viewMode === "form" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                                    )}
                                >
                                    <div className="min-h-full animate-in fade-in slide-in-from-left-4 duration-150">
                                        {formContent}
                                    </div>
                                </div>

                                {/* Intelligence Engine Panel (AI Chat) */}
                                <div
                                    className={cn(
                                        "absolute inset-0 overflow-y-auto custom-scrollbar transition-opacity duration-300",
                                        viewMode === "ai" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                                    )}
                                >
                                    <div className="min-h-full animate-in fade-in slide-in-from-left-4 duration-150 p-6">
                                        {aiContent || (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-2xl border border-border border-dashed">
                                                <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
                                                <h3 className="text-base font-semibold text-foreground">AI Context Initializing</h3>
                                                <p className="text-sm text-muted-foreground mt-2 max-w-xs">Connecting to AnythingLLM Strategic Node...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Financial Audit Panel (Margin Analysis / Pricing Breakdown) */}
                                <div
                                    className={cn(
                                        "absolute inset-0 flex flex-col min-h-0 overflow-hidden transition-opacity duration-300",
                                        viewMode === "audit" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                                    )}
                                >
                                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-left-4 duration-150 p-6">
                                        {auditContent || (
                                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-muted/20 rounded-2xl border border-border border-dashed">
                                                <Table className="w-12 h-12 text-muted-foreground mb-4" />
                                                <h3 className="text-base font-semibold text-foreground">No Audit Data</h3>
                                                <p className="text-sm text-muted-foreground mt-2 max-w-xs">Finalize your technical specifications to activate the Financial Audit.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* REQ-26: Project Health Sidebar */}
                            {viewMode === "form" && (
                                <IntelligenceSidebar
                                    isVisible={isHealthSidebarVisible}
                                    onToggle={() => setIsHealthSidebarVisible(!isHealthSidebarVisible)}
                                />
                            )}
                        </div>
                    </section>

                    {/* THE ANCHOR (Right Pane: 50vw) */}
                    <section className="relative bg-muted/30 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex items-start justify-center">
                            {/* Brand Signature Slashes in background */}
                            <BrandSlashes
                                className="absolute -top-20 -right-20 pointer-events-none transition-opacity duration-1000"
                                width={600}
                                height={600}
                                opacity={0.05}
                                count={12}
                            />

                            <div className="relative z-10 w-full max-w-[850px]">
                                {pdfContent}
                            </div>
                        </div>

                        {/* Footer Status for PDF */}
                        <div className="h-9 border-t border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live Preview Engine
                            </span>
                            <span className="text-muted-foreground/60">ANC IDENTITY PROTECTION ACTIVE</span>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
}

export default StudioLayout;
