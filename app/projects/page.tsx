"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
    Plus,
    Search,
    LayoutGrid,
    List,
    Bell,
    Settings
} from "lucide-react";
import NewProjectModal from "@/app/components/modals/NewProjectModal";
import ProjectCard, { type ProjectCardData } from "@/app/components/ProjectCard";
import DashboardChat from "@/app/components/DashboardChat";
import DashboardSidebar from "@/app/components/layout/DashboardSidebar";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

const statusFilters = [
    { key: "all", label: "Overview" },
    { key: "DRAFT", label: "Drafts" },
    { key: "APPROVED", label: "Approved" },
    { key: "SIGNED", label: "Signed" },
];

export default function ProjectsPage() {
    const [projects, setProjects] = useState<ProjectCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            if (statusFilter !== "all") params.append("status", statusFilter);

            const response = await fetch(`/api/projects?${params.toString()}`);
            const data = await response.json();
            setProjects(data.projects || []);
        } catch (error) {
            console.error("Error fetching projects:", error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(fetchProjects, 300);
        return () => clearTimeout(timer);
    }, [fetchProjects]);

    const summary = useMemo(() => {
        const projectCount = projects.length;
        const mirrorCount = projects.filter((project) => project.mirrorMode).length;
        const intelligenceCount = projectCount - mirrorCount;
        const totalPipeline = projects.reduce((sum, project) => sum + (project.totalAmount || 0), 0);
        const formattedPipeline = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(totalPipeline);

        return {
            projectCount,
            mirrorCount,
            intelligenceCount,
            formattedPipeline,
        };
    }, [projects]);

    return (
        <div className="flex min-h-screen min-w-0 bg-background text-muted-foreground selection:bg-brand-blue/30 overflow-x-hidden">
            <DashboardSidebar />

            <div className="flex-1 flex flex-col min-w-0 relative ml-16 md:ml-20 overflow-x-hidden">
                {/* ✨ Elevated Header - Fixed at top */}
                <header className="fixed top-0 left-16 md:left-20 right-0 h-16 border-b border-border flex items-center justify-between gap-3 px-4 sm:px-6 bg-background/95 backdrop-blur z-50 min-w-0">
                    {/* Left: Logo + Search */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        {/* ANC Brand Mark */}
                        <Link href="/" className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#0A52EF] to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-foreground font-bold text-sm">A</span>
                            </div>
                            <span className="text-foreground font-medium text-sm hidden sm:block">ANC</span>
                        </Link>

                        <div className="h-6 w-px bg-border hidden sm:block" />

                        {/* Enhanced Search */}
                        <div className="relative group max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand-blue transition-colors duration-200" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:border-brand-blue/50 focus:bg-muted focus:ring-1 focus:ring-brand-blue/20 transition-all duration-200"
                            />
                            {/* Keyboard shortcut hint */}
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border">
                                ⌘K
                            </kbd>
                        </div>
                    </div>

                    {/* Right: Actions - no shrink so buttons stay visible */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* Notification Bell */}
                        <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#0A52EF] rounded-full animate-pulse" />
                        </button>

                        {/* Settings */}
                        <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200">
                            <Settings className="w-4 h-4" />
                        </button>

                        <div className="h-6 w-px bg-border mx-1" />

                        {/* New Project Button */}
                        <NewProjectModal>
                            <button className="px-4 py-2 bg-white text-black rounded-xl hover:bg-zinc-100 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-sm font-semibold flex items-center gap-2 shadow-lg shadow-white/10">
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">New Project</span>
                                <span className="sm:hidden">New</span>
                            </button>
                        </NewProjectModal>
                    </div>
                </header>

                <main className="flex-1 mt-16 pt-12 pb-48 px-12 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {/* Hero Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-normal text-foreground serif-vault flex items-baseline gap-2">
                                    {(() => {
                                        const h = new Date().getHours();
                                        if (h < 12) return "Good morning,";
                                        if (h < 17) return "Good afternoon,";
                                        return "Good evening,";
                                    })()}
                                </h1>
                                <p className="text-sm text-muted-foreground font-medium">
                                    here's a quick look at how things are going.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {/* Status Toggles */}
                                <div className="flex bg-muted/50 p-1 rounded-lg border border-border shrink-0">
                                    {statusFilters.map(filter => (
                                        <button
                                            key={filter.key}
                                            onClick={() => setStatusFilter(filter.key)}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded transition-all",
                                                statusFilter === filter.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                            )}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-6 w-px bg-border" />

                                <button className="p-2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                                    {viewMode === "grid" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Architectural Grid */}
                        {loading && projects.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-48 bg-muted/40 rounded-lg animate-pulse border border-border/50" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                    <div className="border border-border rounded-lg bg-card px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Projects</div>
                                        <div className="text-2xl font-semibold text-foreground">{summary.projectCount}</div>
                                    </div>
                                    <div className="border border-border rounded-lg bg-card px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Mirror</div>
                                        <div className="text-2xl font-semibold text-foreground">{summary.mirrorCount}</div>
                                    </div>
                                    <div className="border border-border rounded-lg bg-card px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Intelligence</div>
                                        <div className="text-2xl font-semibold text-foreground">{summary.intelligenceCount}</div>
                                    </div>
                                    <div className="border border-border rounded-lg bg-card px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Pipeline</div>
                                        <div className="text-2xl font-semibold text-foreground">{summary.formattedPipeline}</div>
                                    </div>
                                </div>

                                <div className={cn(
                                    "grid",
                                    viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "grid-cols-1 gap-1 bg-card border border-border"
                                )}>
                                    {projects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onImport={() => { }}
                                            onDelete={() => { }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Dashboard chat (Phase 2 - hidden when not functional) */}
                {FEATURES.DASHBOARD_CHAT && (
                <div className="fixed bottom-0 left-16 md:left-20 right-0 p-4 sm:p-8 flex justify-center pointer-events-none z-40">
                    <div className="w-full max-w-3xl min-w-0 pointer-events-auto">
                        <DashboardChat />
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
