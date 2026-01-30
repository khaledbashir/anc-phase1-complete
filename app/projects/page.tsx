"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Clock, DollarSign, User, ChevronRight, Loader2, Upload } from "lucide-react";
import LogoSelector from "@/app/components/reusables/LogoSelector";
import NewProjectModal from "@/app/components/modals/NewProjectModal";

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
}

/**
 * Project Dashboard - The Project Vault
 * 
 * Features:
 * - List all active bids with key metrics
 * - Search by Client Name or Location
 * - Instant project switcher (shallow routing)
 * - Create new project with auto-workspace creation
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



    const openProject = (projectId: string) => {
        router.push(`/projects/${projectId}`);
    };

    const handleImportQuickAction = (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls';
        input.onchange = (ev: any) => {
            const file = ev.target.files?.[0];
            if (file) {
                // Redirect to editor with auto-import flag or just projectId
                // The ProposalPage handles the rest.
                router.push(`/projects/${projectId}?autoImport=true`);
                // Note: We'll need to handle the autoImport flag in ProposalPage
            }
        };
        input.click();
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            DRAFT: "bg-yellow-100 text-yellow-800",
            PENDING_APPROVAL: "bg-blue-100 text-blue-800",
            FINALIZED: "bg-green-100 text-green-800",
        };
        return styles[status] || "bg-zinc-100 text-zinc-800";
    };

    return (
        <div className="min-h-screen bg-zinc-50">
            {/* Header */}
            <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <LogoSelector theme="light" width={120} height={60} />
                        <div className="h-8 w-px bg-zinc-200" />
                        <h1 className="text-xl font-bold text-zinc-800">Project Vault</h1>
                    </div>
                    <NewProjectModal>
                        <button className="flex items-center gap-2 px-4 py-2 bg-[#0A52EF] text-white rounded-lg font-medium hover:bg-[#0A52EF]/90 transition-colors">
                            <Plus className="w-4 h-4" />
                            New Project
                        </button>
                    </NewProjectModal>
                </div>
            </header>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                            type="text"
                            placeholder="Search by Client or Location..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A52EF] focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A52EF]"
                    >
                        <option value="all">All Status</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="FINALIZED">Finalized</option>
                    </select>
                </div>

                {/* Project List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-[#0A52EF]" />
                    </div>
                ) : projects.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-zinc-400 mb-4">No projects found</div>
                        <NewProjectModal>
                            <button className="text-[#0A52EF] font-medium hover:underline">
                                Create your first project
                            </button>
                        </NewProjectModal>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {projects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => openProject(project.id)}
                                className="bg-white border border-zinc-200 rounded-xl p-5 hover:border-[#0A52EF] hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-zinc-800 group-hover:text-[#0A52EF] transition-colors">
                                                {project.proposalName || project.clientName}
                                            </h3>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusBadge(project.status)}`}>
                                                {project.status.replace("_", " ")}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-6 text-sm text-zinc-500">
                                            <span className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                {project.clientName}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatDate(project.updatedAt)}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-zinc-100 rounded">
                                                {project.documentType} • {project.pricingType}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => handleImportQuickAction(e, project.id)}
                                            className="p-2 text-zinc-400 hover:text-[#0A52EF] hover:bg-zinc-100 rounded-lg transition-all"
                                            title="Quick Import Excel"
                                        >
                                            <Upload className="w-4 h-4" />
                                        </button>
                                        <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-[#0A52EF] transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
