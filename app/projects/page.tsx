"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Loader2, Building2, Sparkles } from "lucide-react";
import LogoSelector from "@/app/components/reusables/LogoSelector";
import NewProjectModal from "@/app/components/modals/NewProjectModal";
import ProjectCard from "@/app/components/ProjectCard";
import DashboardChat from "@/app/components/DashboardChat";

interface Project {
    id: string;
    clientName: string;
    proposalName: string | null;
    status: string;
    documentType: string;
    pricingType: string;
    createdAt: string;
    updatedAt: string;
    lastSavedAt: string | null;
    screenCount?: number;
    aiWorkspaceSlug?: string | null;
}

/**
 * Project Vault - The Dashboard
 * 
 * Features:
 * - Fancy hover cards with expanded details
 * - Search by Client Name or Location
 * - Dashboard AI Chat (business-wide context)
 * - Quick actions per project
 */
export default function ProjectsPage() {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set("search", searchQuery);
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/projects?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setProjects(data.projects);
            }
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleImport = (projectId: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = (ev: any) => {
            const file = ev.target.files?.[0];
            if (file) {
                router.push(`/projects/${projectId}?autoImport=true`);
            }
        };
        input.click();
    };

    const handleDelete = async (projectId: string) => {
        if (!confirm("Are you sure you want to delete this project?")) return;

        try {
            const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
            if (res.ok) {
                fetchProjects();
            }
        } catch (error) {
            console.error("Failed to delete project:", error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-blue-50/30">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-zinc-200/50 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <LogoSelector theme="light" width={100} height={50} className="p-0" />
                        <div className="h-8 w-px bg-zinc-200" />
                        <div>
                            <h1 className="text-xl font-bold text-zinc-800">Project Vault</h1>
                            <p className="text-xs text-zinc-500">Your ANC Intelligence Hub</p>
                        </div>
                    </div>

                    {/* Stats badge */}
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full">
                            <Building2 className="w-4 h-4 text-[#0A52EF]" />
                            <span className="text-xs font-medium text-zinc-600">
                                {projects.length} Projects
                            </span>
                            <Sparkles className="w-3 h-3 text-purple-500" />
                        </div>

                        <NewProjectModal>
                            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0A52EF] to-[#0A52EF]/90 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#0A52EF]/20 transition-all">
                                <Plus className="w-4 h-4" />
                                New Project
                            </button>
                        </NewProjectModal>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Filters */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by Client or Location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A52EF] focus:border-transparent shadow-sm"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-3 bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A52EF] shadow-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING_VERIFICATION">Pending Verification</option>
                        <option value="APPROVED">Approved</option>
                        <option value="SHARED">Shared</option>
                        <option value="SIGNED">Signed</option>
                    </select>
                </div>

                {/* Project Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <Loader2 className="w-10 h-10 animate-spin text-[#0A52EF] mx-auto mb-4" />
                            <p className="text-sm text-zinc-500">Loading projects...</p>
                        </div>
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-zinc-200 shadow-sm">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-[#0A52EF]" />
                        </div>
                        <h3 className="text-lg font-bold text-zinc-800 mb-2">No projects yet</h3>
                        <p className="text-zinc-400 mb-6">Create your first project to get started</p>
                        <NewProjectModal>
                            <button className="inline-flex items-center gap-2 px-6 py-3 bg-[#0A52EF] text-white rounded-xl font-medium hover:bg-[#0A52EF]/90 transition-colors">
                                <Plus className="w-4 h-4" />
                                Create First Project
                            </button>
                        </NewProjectModal>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {projects.map((project) => (
                            <ProjectCard
                                key={project.id}
                                project={project}
                                onImport={handleImport}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Dashboard Chat - Floating */}
            <DashboardChat />
        </div>
    );
}
