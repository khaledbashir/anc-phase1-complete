"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Clock,
    User,
    ChevronRight,
    Upload,
    Trash2,
    Sparkles,
    Monitor,
    FileText,
    Building2,
    Briefcase,
    Layers
} from "lucide-react";
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

const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
};

const getStatusConfig = (status: string) => {
    const configs: Record<string, {
        bg: string;
        text: string;
        glow: string;
        label: string;
        dotColor: string;
    }> = {
        DRAFT: {
            bg: "bg-amber-500/15",
            text: "text-amber-600",
            glow: "shadow-amber-500/30",
            label: "Draft",
            dotColor: "bg-amber-500"
        },
        PENDING_VERIFICATION: {
            bg: "bg-blue-500/15",
            text: "text-blue-600",
            glow: "shadow-blue-500/30",
            label: "Pending",
            dotColor: "bg-blue-500"
        },
        APPROVED: {
            bg: "bg-emerald-500/15",
            text: "text-emerald-600",
            glow: "shadow-emerald-500/30",
            label: "Approved",
            dotColor: "bg-emerald-500"
        },
        SHARED: {
            bg: "bg-purple-500/15",
            text: "text-purple-600",
            glow: "shadow-purple-500/30",
            label: "Shared",
            dotColor: "bg-purple-500"
        },
        SIGNED: {
            bg: "bg-green-500/15",
            text: "text-green-600",
            glow: "shadow-green-500/30",
            label: "Signed",
            dotColor: "bg-green-500"
        },
    };
    return configs[status] || {
        bg: "bg-zinc-500/15",
        text: "text-zinc-600",
        glow: "shadow-zinc-500/30",
        label: status,
        dotColor: "bg-zinc-500"
    };
};

const getProjectTypeIcon = (documentType: string) => {
    switch (documentType) {
        case "RFP":
            return FileText;
        case "BUDGET":
            return Briefcase;
        default:
            return Layers;
    }
};

const getProjectGradient = (documentType: string) => {
    switch (documentType) {
        case "RFP":
            return "from-[#0A52EF]/20 via-[#03B8FF]/10 to-[#0385DD]/20";
        case "BUDGET":
            return "from-purple-500/20 via-purple-400/10 to-purple-600/20";
        default:
            return "from-teal-500/20 via-teal-400/10 to-teal-600/20";
    }
};

/**
 * ProjectCard - Premium Boutique-Style Glassmorphism Card
 * 
 * Features:
 * - Glassmorphism with backdrop blur
 * - Gradient icon container with animated decorations
 * - Animated status badge with pulse
 * - Progress indicator
 * - Team avatars stack
 * - Premium hover lift effect
 */
const ProjectCard = ({ project, onImport, onDelete }: ProjectCardProps) => {
    const router = useRouter();
    const [isHovered, setIsHovered] = useState(false);
    const status = getStatusConfig(project.status);
    const TypeIcon = getProjectTypeIcon(project.documentType);
    const gradient = getProjectGradient(project.documentType);

    // Mock progress based on status (in real app, this would come from project data)
    const getProgress = () => {
        switch (project.status) {
            case "DRAFT": return 25;
            case "PENDING_VERIFICATION": return 50;
            case "APPROVED": return 75;
            case "SHARED": return 90;
            case "SIGNED": return 100;
            default: return 0;
        }
    };

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
                "anc-glass-card anc-card-lift anc-glow-card",
                "rounded-3xl p-6 cursor-pointer",
                "group relative overflow-hidden"
            )}
        >
            {/* Decorative Background Pattern */}
            <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, rgba(10, 82, 239, 0.03) 0%, transparent 50%)`,
                    backgroundSize: '20px 20px'
                }}
            />

            {/* Icon Preview Area */}
            <div className={cn(
                "relative h-40 mb-5 rounded-2xl overflow-hidden",
                "bg-gradient-to-br",
                gradient,
                "flex items-center justify-center"
            )}>
                {/* Animated decorative ring */}
                <div className={cn(
                    "absolute w-28 h-28 border-2 border-current rounded-full opacity-20",
                    "transition-transform duration-700",
                    isHovered ? "scale-110 rotate-45" : "scale-100 rotate-0"
                )} style={{ color: '#0A52EF' }} />

                {/* Icon container */}
                <div className={cn(
                    "w-20 h-20 rounded-full",
                    "bg-white/50 backdrop-blur-sm",
                    "flex items-center justify-center",
                    "shadow-lg shadow-black/5",
                    "transition-transform duration-300 overflow-hidden",
                    isHovered && "scale-110"
                )}>
                    {project.clientLogo ? (
                        <img
                            src={project.clientLogo}
                            alt={`${project.clientName} logo`}
                            className="w-12 h-12 object-contain"
                        />
                    ) : (
                        <TypeIcon className="w-10 h-10 text-[#0A52EF]" />
                    )}
                </div>

                {/* Status Badge - Positioned in corner */}
                <div className={cn(
                    "absolute bottom-3 right-3",
                    "anc-glass-card px-3 py-1.5 rounded-lg",
                    "flex items-center gap-2"
                )}>
                    <span className="relative flex h-2 w-2">
                        <span className={cn(
                            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                            status.dotColor
                        )} />
                        <span className={cn(
                            "relative inline-flex rounded-full h-2 w-2",
                            status.dotColor
                        )} />
                    </span>
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest",
                        status.text
                    )}>
                        {status.label}
                    </span>
                </div>

                {/* AI Badge */}
                {project.aiWorkspaceSlug && (
                    <div className="absolute top-3 left-3 anc-glass-card px-2 py-1 rounded-lg">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="relative z-10">
                {/* Title */}
                <h3 className={cn(
                    "font-serif text-2xl font-bold mb-2 line-clamp-1",
                    "transition-colors duration-200",
                    isHovered ? "text-[#0A52EF]" : "text-zinc-800"
                )}>
                    {project.proposalName || project.clientName}
                </h3>

                {/* Client & Meta */}
                <div className="flex items-center gap-3 text-sm text-zinc-500 mb-4">
                    <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {project.clientName}
                    </span>
                    <span className="text-zinc-300">•</span>
                    <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {formatRelativeTime(project.updatedAt)}
                    </span>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                    <span className="px-2.5 py-1 bg-zinc-100/80 rounded-lg text-xs font-medium text-zinc-600">
                        {project.documentType}
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-100/80 rounded-lg text-xs font-medium text-zinc-600">
                        {project.pricingType}
                    </span>
                    {project.screenCount !== undefined && project.screenCount > 0 && (
                        <span className="px-2.5 py-1 bg-[#0A52EF]/10 rounded-lg text-xs font-medium text-[#0A52EF] flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            {project.screenCount} Screens
                        </span>
                    )}
                </div>

                {/* Footer: Avatars + Progress */}
                <div className="flex items-center justify-between">
                    {/* Team Avatars */}
                    <div className="flex -space-x-2">
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#0A52EF] to-[#03B8FF] flex items-center justify-center text-white text-[10px] font-bold">
                            {project.clientName.charAt(0)}
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                            A
                        </div>
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-zinc-100 flex items-center justify-center text-zinc-500 text-[10px] font-bold">
                            +2
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="text-right">
                        <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-wide">Progress</p>
                        <p className="text-sm font-bold text-zinc-700">{getProgress()}%</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 h-1.5 w-full bg-zinc-200/50 rounded-full overflow-hidden">
                    <div
                        className={cn(
                            "h-full rounded-full transition-all duration-500",
                            project.status === "SIGNED" ? "bg-emerald-500" :
                                project.status === "APPROVED" ? "bg-[#0A52EF]" :
                                    project.status === "SHARED" ? "bg-purple-500" :
                                        "bg-[#0A52EF]"
                        )}
                        style={{ width: `${getProgress()}%` }}
                    />
                </div>
            </div>

            {/* Quick Actions - Visible on Hover */}
            <div className={cn(
                "absolute top-4 right-4 flex gap-2",
                "transition-all duration-200",
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
            )}>
                <button
                    onClick={(e) => handleQuickAction(e, "import")}
                    className="p-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-[#0A52EF] hover:text-white text-zinc-500 transition-all shadow-lg"
                    title="Import Excel"
                >
                    <Upload className="w-4 h-4" />
                </button>
                <button
                    onClick={(e) => handleQuickAction(e, "delete")}
                    className="p-2 rounded-xl bg-white/80 backdrop-blur-sm hover:bg-red-500 hover:text-white text-zinc-500 transition-all shadow-lg"
                    title="Delete Project"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Arrow Indicator */}
            <ChevronRight className={cn(
                "absolute right-5 bottom-6 w-5 h-5 transition-all duration-200",
                isHovered ? "text-[#0A52EF] translate-x-0 opacity-100" : "text-zinc-300 -translate-x-1 opacity-50"
            )} />
        </div>
    );
};

export default ProjectCard;
