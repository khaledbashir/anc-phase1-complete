"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Clock,
    DollarSign,
    User,
    ChevronRight,
    Upload,
    Trash2,
    Edit3,
    FileText,
    Sparkles,
    Monitor,
    Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ProjectCardProps {
    project: Project;
    onImport?: (projectId: string) => void;
    onDelete?: (projectId: string) => void;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; glow: string }> = {
        DRAFT: { bg: "bg-amber-500/10", text: "text-amber-400", glow: "shadow-amber-500/20" },
        PENDING_VERIFICATION: { bg: "bg-blue-500/10", text: "text-blue-400", glow: "shadow-blue-500/20" },
        APPROVED: { bg: "bg-emerald-500/10", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
        SHARED: { bg: "bg-purple-500/10", text: "text-purple-400", glow: "shadow-purple-500/20" },
        SIGNED: { bg: "bg-green-500/10", text: "text-green-400", glow: "shadow-green-500/20" },
    };
    return styles[status] || { bg: "bg-zinc-500/10", text: "text-zinc-400", glow: "shadow-zinc-500/20" };
};

/**
 * ProjectCard - Fancy hover card for project list
 * Features:
 * - Glassmorphism effect on hover
 * - Expanded details on hover
 * - Quick action buttons
 * - Status indicator with glow
 */
const ProjectCard = ({ project, onImport, onDelete }: ProjectCardProps) => {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const status = getStatusBadge(project.status);

    const handleClick = () => {
        router.push(`/projects/${project.id}`);
    };

    const handleQuickAction = (e: React.MouseEvent, action: "import" | "delete") => {
        e.stopPropagation();
        if (action === "import" && onImport) {
            onImport(project.id);
        } else if (action === "delete" && onDelete) {
            onDelete(project.id);
        }
    };

    return (
        <div
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "relative group cursor-pointer rounded-2xl p-[1px] transition-all duration-300",
                isHovered
                    ? "bg-gradient-to-r from-[#0A52EF] via-purple-500 to-[#0A52EF] shadow-lg shadow-[#0A52EF]/20"
                    : "bg-zinc-200"
            )}
        >
            {/* Inner card with glassmorphism */}
            <div className={cn(
                "relative bg-white rounded-2xl p-5 transition-all duration-300 overflow-hidden",
                isHovered && "bg-gradient-to-br from-white to-blue-50"
            )}>
                {/* Animated gradient background on hover */}
                <div className={cn(
                    "absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none",
                    "bg-gradient-to-br from-[#0A52EF]/5 via-transparent to-purple-500/5",
                    isHovered && "opacity-100"
                )} />

                {/* Main content */}
                <div className="relative z-10">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className={cn(
                                    "text-lg font-bold text-zinc-800 truncate transition-colors duration-200",
                                    isHovered && "text-[#0A52EF]"
                                )}>
                                    {project.proposalName || project.clientName}
                                </h3>
                                <span className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wide",
                                    status.bg, status.text,
                                    isHovered && `shadow-md ${status.glow}`
                                )}>
                                    {project.status.replace(/_/g, " ")}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-500 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5" />
                                {project.clientName}
                            </p>
                        </div>

                        {/* Quick actions (visible on hover) */}
                        <div className={cn(
                            "flex items-center gap-1.5 transition-all duration-200",
                            isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-2"
                        )}>
                            <button
                                onClick={(e) => handleQuickAction(e, "import")}
                                className="p-2 rounded-lg bg-zinc-100 hover:bg-[#0A52EF]/10 hover:text-[#0A52EF] text-zinc-500 transition-all"
                                title="Import Excel"
                            >
                                <Upload className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => handleQuickAction(e, "delete")}
                                className="p-2 rounded-lg bg-zinc-100 hover:bg-red-50 hover:text-red-500 text-zinc-500 transition-all"
                                title="Delete Project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Info row - always visible */}
                    <div className="flex items-center gap-4 text-xs text-zinc-500 mb-3">
                        <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatDate(project.updatedAt)}
                        </span>
                        <span className="px-2 py-0.5 bg-zinc-100 rounded text-zinc-600 font-medium">
                            {project.documentType} • {project.pricingType}
                        </span>
                    </div>

                    {/* Expanded details - visible on hover */}
                    <div className={cn(
                        "grid grid-cols-3 gap-4 overflow-hidden transition-all duration-300",
                        isHovered ? "max-h-24 opacity-100 mt-4 pt-4 border-t border-zinc-100" : "max-h-0 opacity-0"
                    )}>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Monitor className="w-4 h-4 text-[#0A52EF]" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Screens</p>
                                <p className="text-sm font-bold text-zinc-700">{project.screenCount || 0}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-amber-500" />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Created</p>
                                <p className="text-sm font-bold text-zinc-700">{formatDate(project.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                project.aiWorkspaceSlug ? "bg-purple-50" : "bg-zinc-100"
                            )}>
                                <Sparkles className={cn(
                                    "w-4 h-4",
                                    project.aiWorkspaceSlug ? "text-purple-500" : "text-zinc-400"
                                )} />
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase tracking-wide">AI</p>
                                <p className="text-sm font-bold text-zinc-700">
                                    {project.aiWorkspaceSlug ? "Active" : "Off"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Arrow indicator */}
                <ChevronRight className={cn(
                    "absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-all duration-200",
                    isHovered ? "text-[#0A52EF] translate-x-0" : "text-zinc-300 -translate-x-1"
                )} />
            </div>
        </div>
    );
};

export default ProjectCard;
