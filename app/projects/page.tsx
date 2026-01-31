"use client";

import { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Loader2,
    LayoutGrid,
    List,
    Filter,
    Download,
    ChevronDown,
    Bell,
    Settings
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NewProjectModal from "@/app/components/modals/NewProjectModal";
import ProjectCard from "@/app/components/ProjectCard";
import DashboardChat from "@/app/components/DashboardChat";
import DashboardSidebar from "@/app/components/layout/DashboardSidebar";
import { cn } from "@/lib/utils";

interface Project {
    id: string;
    clientName: string;
    proposalName: string | null;
    clientLogo?: string | null;
    status: string;
    documentType: string;
    pricingType: string;
    createdAt: string;
    updatedAt: string;
    lastSavedAt: string | null;
    screenCount?: number;
    totalAmount?: number;
}

const statusFilters = [
    { key: "all", label: "Overview" },
    { key: "DRAFT", label: "Drafts" },
    { key: "APPROVED", label: "Approved" },
    { key: "SIGNED", label: "Signed" },
];

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [statusFilter, setStatusFilter] = useState("all");

    const fetchProjects = async () => {
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
    };

    useEffect(() => {
        const timer = setTimeout(fetchProjects, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter]);

    return (
        <div className="flex h-screen bg-[#000000] text-zinc-400 overflow-hidden selection:bg-[#0A52EF]/30">
            <DashboardSidebar />

            <div className="flex-1 flex flex-col min-w-0 relative">
                {/* Midday-Style Header */}
                <header className="h-16 border-b border-zinc-900 flex items-center justify-between px-8 bg-black z-40 shrink-0">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="relative group max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-zinc-400 transition-colors" />
                            <input
                                type="text"
                                placeholder="Find anything..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-700 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <NewProjectModal>
                            <button className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors text-sm font-medium flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                New Project
                            </button>
                        </NewProjectModal>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pt-12 pb-32 px-12">
                    <div className="max-w-7xl mx-auto space-y-12">
                        {/* Hero Section */}
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div className="space-y-1">
                                <h1 className="text-4xl font-normal text-white serif-vault flex items-baseline gap-2">
                                    Evening <span className="text-zinc-600 italic">User,</span>
                                </h1>
                                <p className="text-sm text-zinc-500 font-medium">
                                    here's a quick look at how things are going.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                {/* Status Toggles */}
                                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                                    {statusFilters.map(filter => (
                                        <button
                                            key={filter.key}
                                            onClick={() => setStatusFilter(filter.key)}
                                            className={cn(
                                                "px-3 py-1 text-xs font-medium rounded transition-all",
                                                statusFilter === filter.key ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                            )}
                                        >
                                            {filter.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-6 w-px bg-zinc-800" />

                                <button className="p-2 text-zinc-500 hover:text-white transition-colors" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}>
                                    {viewMode === "grid" ? <LayoutGrid className="w-4 h-4" /> : <List className="w-4 h-4" />}
                                </button>

                                <NewProjectModal>
                                    <button className="p-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </NewProjectModal>
                            </div>
                        </div>

                        {/* Architectural Grid */}
                        {loading && projects.length === 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-48 bg-zinc-900/40 rounded-lg animate-pulse border border-zinc-800/50" />
                                ))}
                            </div>
                        ) : (
                            <div className={cn(
                                "grid",
                                viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "grid-cols-1 gap-1 bg-zinc-900 border border-zinc-900"
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
                        )}
                    </div>
                </main>

                {/* Midday-Style Bottom AI Chat */}
                <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center pointer-events-none">
                    <div className="w-full max-w-3xl pointer-events-auto">
                        <DashboardChat />
                    </div>
                </div>
            </div>
        </div>
    );
}
