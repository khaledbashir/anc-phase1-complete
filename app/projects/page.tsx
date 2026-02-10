"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
    Bell,
    Brain,
    ChevronDown,
    ChevronUp,
    LayoutGrid,
    List,
    Plus,
    Search,
    Settings,
} from "lucide-react";
import NewProjectModal from "@/app/components/modals/NewProjectModal";
import ProjectCard, { type DashboardStatus, type ProjectCardData } from "@/app/components/ProjectCard";
import DashboardChat from "@/app/components/DashboardChat";
import DashboardSidebar from "@/app/components/layout/DashboardSidebar";
import DashboardBriefMe from "@/app/components/dashboard/DashboardBriefMe";
import CopilotPanel from "@/app/components/chat/CopilotPanel";
import { FEATURES } from "@/lib/featureFlags";
import { cn } from "@/lib/utils";

const statusFilters = [
    { key: "all", label: "Overview" },
    { key: "DRAFT", label: "Drafts" },
    { key: "APPROVED", label: "Approved" },
    { key: "SIGNED", label: "Signed" },
];

const formatCurrency = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount || 0);

const formatCompactCurrency = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(amount || 0);

function generateInsights(projects: ProjectCardData[]): string[] {
    const insights: string[] = [];

    const staleCount = projects.filter((project) => {
        const daysSinceUpdate = (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceUpdate > 7 && project.status === "DRAFT";
    }).length;
    if (staleCount > 0) {
        insights.push(`${staleCount} proposal${staleCount > 1 ? "s" : ""} unchanged for 7+ days — may need follow-up`);
    }

    const sortedByValue = [...projects].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
    if (sortedByValue[0]?.totalAmount > 0) {
        insights.push(`${sortedByValue[0].clientName} is your highest-value deal at ${formatCurrency(sortedByValue[0].totalAmount, sortedByValue[0].currency)}`);
    }

    const recentCount = projects.filter((project) => {
        const hoursSinceUpdate = (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60);
        return hoursSinceUpdate < 24;
    }).length;
    if (recentCount > 0) {
        insights.push(`${recentCount} project${recentCount > 1 ? "s" : ""} updated in the last 24 hours`);
    }

    const intelligenceCount = projects.filter((project) => !project.mirrorMode).length;
    if (intelligenceCount > 0) {
        insights.push(`${intelligenceCount} Intelligence Mode project${intelligenceCount > 1 ? "s" : ""} in progress`);
    }

    return insights.slice(0, 3);
}

export default function ProjectsPage() {
    const { data: session } = useSession();
    const [projects, setProjects] = useState<ProjectCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [statusFilter, setStatusFilter] = useState("all");
    const [showInsights, setShowInsights] = useState(true);
    const [briefProjectId, setBriefProjectId] = useState<string | null>(null);
    const [isBriefOpen, setIsBriefOpen] = useState(false);
    const router = useRouter();

    const fetchProjects = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (searchQuery) params.append("search", searchQuery);
            if (statusFilter !== "all") params.append("status", statusFilter);

            const response = await fetch(`/api/projects?${params.toString()}`, { cache: "no-store" });
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Failed to fetch projects");
            }
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
        const formattedPipeline = formatCurrency(totalPipeline, "USD");
        const filterLabel = statusFilter === "all"
            ? "All Projects"
            : statusFilter === "DRAFT"
                ? "Drafts"
                : statusFilter === "APPROVED"
                    ? "Approved"
                    : "Signed";

        return {
            projectCount,
            mirrorCount,
            intelligenceCount,
            totalPipeline,
            formattedPipeline,
            filterLabel,
        };
    }, [projects, statusFilter]);

    const insights = useMemo(() => generateInsights(projects), [projects]);
    const heroGreeting = useMemo(() => {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
        const firstName = session?.user?.name?.trim()?.split(/\s+/)?.[0] || null;
        const totalValue = projects.reduce((sum, project) => sum + (project.totalAmount || 0), 0);
        const updatedTodayCount = projects.filter((project) => {
            const hoursSinceUpdate = (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60);
            return hoursSinceUpdate < 24;
        }).length;
        const staleCount = projects.filter((project) => {
            const daysSinceUpdate = (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate > 7 && project.status === "DRAFT";
        }).length;
        const topDeal = [...projects].sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))[0];

        const title = firstName ? `${greeting}, ${firstName} 👋` : `${greeting} 👋`;
        const insights: string[] = [];

        insights.push(`${projects.length} projects in the pipeline worth ${formatCompactCurrency(totalValue)}.`);

        if (updatedTodayCount > 0) {
            insights.push(`${updatedTodayCount} proposal${updatedTodayCount > 1 ? "s" : ""} updated today`);
        }

        if (topDeal?.clientName && topDeal.totalAmount > 0) {
            insights.push(`${topDeal.clientName} is your biggest deal at ${formatCompactCurrency(topDeal.totalAmount, topDeal.currency || "USD")}`);
        }

        if (staleCount > 0) {
            insights.push(`${staleCount} draft${staleCount > 1 ? "s haven't" : " hasn't"} been touched in over a week`);
        }

        return {
            title,
            line: insights.slice(0, 2).join(". ") + (insights.length > 0 ? "." : ""),
        };
    }, [projects, session?.user?.name]);

    const handleStatusChange = useCallback(async (id: string, nextStatus: DashboardStatus) => {
        const response = await fetch(`/api/projects/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextStatus }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Failed to update status to ${nextStatus}`);
        }

        setProjects((current) =>
            current
                .map((project) => (project.id === id ? { ...project, status: nextStatus } : project))
                .filter((project) => (statusFilter === "all" ? true : project.status === statusFilter))
        );
    }, [statusFilter]);

    const handleBriefMe = useCallback((id: string) => {
        setBriefProjectId(id);
        setIsBriefOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/api/projects/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || "Failed to delete project");
            }

            setProjects((current) => current.filter((project) => project.id !== id));
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete project. Please try again.");
        }
    }, []);

    const copilotContext = useMemo(() => {
        const topProjects = [...projects]
            .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))
            .slice(0, 3)
            .map((project) => `${project.clientName} (${formatCurrency(project.totalAmount, project.currency)})`)
            .join(", ");
        const staleCount = projects.filter((project) => {
            const days = (Date.now() - new Date(project.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            return days > 7 && project.status === "DRAFT";
        }).length;
        return `Pipeline: ${summary.projectCount} projects, ${summary.formattedPipeline} total value, ${summary.mirrorCount} Mirror, ${summary.intelligenceCount} Intelligence. Top projects: ${topProjects || "None"}. ${staleCount} stale draft projects.`;
    }, [projects, summary]);

    const handleCopilotMessage = useCallback(async (message: string) => {
        const lower = message.toLowerCase();

        // Local navigation shortcuts (need client-side router)
        if (lower.startsWith("open ")) {
            const query = lower.replace(/^open\s+/, "").trim();
            const match = projects.find((project) => project.clientName.toLowerCase().includes(query));
            if (match) {
                router.push(`/projects/${match.id}`);
                return `Opening ${match.clientName}.`;
            }
            return `I couldn't find a project matching "${query}".`;
        }
        if (lower.includes("start a new") || lower.includes("new project") || lower.includes("new budget")) {
            router.push("/projects/new");
            return "Opening new project setup.";
        }

        // Everything else → real AI via AnythingLLM dashboard workspace
        try {
            const res = await fetch("/api/copilot/dashboard", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message,
                    pipelineContext: copilotContext,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                return `AI error: ${data.response || data.error || res.statusText}`;
            }
            return data.response || "No response received.";
        } catch (err: any) {
            return `AI connection error: ${err?.message || String(err)}`;
        }
    }, [copilotContext, projects, router]);

    return (
        <div className="flex min-h-screen min-w-0 bg-background text-muted-foreground selection:bg-brand-blue/30 overflow-x-hidden">
            <DashboardSidebar />

            <div className="flex-1 flex flex-col min-w-0 relative ml-16 md:ml-20 overflow-x-hidden">
                <header className="fixed top-0 left-16 md:left-20 right-0 h-16 border-b border-border flex items-center justify-between gap-3 px-4 sm:px-6 bg-background/95 backdrop-blur z-50 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                        <Link href="/" className="flex items-center gap-2 shrink-0">
                            <div className="w-8 h-8 bg-gradient-to-br from-[#0A52EF] to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <span className="text-foreground font-bold text-sm">A</span>
                            </div>
                            <span className="text-foreground font-medium text-sm hidden sm:block">ANC</span>
                        </Link>

                        <div className="h-6 w-px bg-border hidden sm:block" />

                        <div className="relative group max-w-md w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-brand-blue transition-colors duration-200" />
                            <input
                                type="text"
                                placeholder="Search projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-muted/50 border border-input rounded-xl text-sm text-foreground placeholder-muted-foreground outline-none focus:border-brand-blue/50 focus:bg-muted focus:ring-1 focus:ring-brand-blue/20 transition-all duration-200"
                            />
                            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border">
                                ⌘K
                            </kbd>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200 relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-[#0A52EF] rounded-full animate-pulse" />
                        </button>
                        <button className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200">
                            <Settings className="w-4 h-4" />
                        </button>
                        <div className="h-6 w-px bg-border mx-1" />
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
                    <div className="max-w-7xl mx-auto space-y-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-3xl font-normal text-foreground serif-vault leading-tight">
                                    {heroGreeting.title}
                                </h1>
                                <p className="text-sm text-muted-foreground font-medium">{heroGreeting.line}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <div className="flex bg-muted/50 p-1 rounded-lg border border-border shrink-0">
                                    {statusFilters.map((filter) => (
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

                        {loading && projects.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="h-48 bg-muted/40 rounded-lg animate-pulse border border-border/50" />
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                                    <div className="border border-border rounded-lg bg-card px-4 py-3">
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{summary.filterLabel}</div>
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
                                        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Pipeline Value</div>
                                        <div className="text-2xl font-semibold text-foreground">{summary.formattedPipeline}</div>
                                    </div>
                                </div>

                                <div className="border border-blue-100 bg-blue-50/70 rounded-lg">
                                    <button
                                        className="w-full px-4 py-3 flex items-center justify-between"
                                        onClick={() => setShowInsights((prev) => !prev)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Brain className="w-4 h-4 text-blue-700" />
                                            <span className="text-sm font-semibold text-blue-900">AI Insights</span>
                                        </div>
                                        {showInsights ? <ChevronUp className="w-4 h-4 text-blue-700" /> : <ChevronDown className="w-4 h-4 text-blue-700" />}
                                    </button>
                                    {showInsights && (
                                        <div className="px-4 pb-4 space-y-2">
                                            {insights.length > 0 ? insights.map((insight) => (
                                                <div key={insight} className="text-sm text-blue-900">
                                                    <span className="mr-2">✨</span>
                                                    {insight}
                                                </div>
                                            )) : (
                                                <div className="text-sm text-blue-900">No actionable insights yet. Keep pipeline activity flowing.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className={cn(
                                    "grid",
                                    viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "grid-cols-1 gap-2"
                                )}>
                                    {projects.map((project) => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            onStatusChange={handleStatusChange}
                                            onBriefMe={handleBriefMe}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {FEATURES.DASHBOARD_CHAT && (
                    <div className="fixed bottom-0 left-16 md:left-20 right-0 p-4 sm:p-8 flex justify-center pointer-events-none z-40">
                        <div className="w-full max-w-3xl min-w-0 pointer-events-auto">
                            <DashboardChat />
                        </div>
                    </div>
                )}

                <DashboardBriefMe projectId={briefProjectId} isOpen={isBriefOpen} onClose={() => setIsBriefOpen(false)} />

                <div className="fixed bottom-6 right-6 z-50">
                    <CopilotPanel
                        onSendMessage={handleCopilotMessage}
                        quickActions={[
                            { label: "Pipeline Value", prompt: "What's my total pipeline value?" },
                            { label: "Needs Attention", prompt: "Which projects need attention?" },
                            { label: "New Proposal", prompt: "Start a new budget proposal." },
                        ]}
                        className="!bottom-0 !right-0"
                    />
                </div>
            </div>
        </div>
    );
}
