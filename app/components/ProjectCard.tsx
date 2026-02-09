"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
    Trash2,
    ArrowUpRight,
    Clock,
    FileSpreadsheet,
    MonitorPlay,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface ProjectCardData {
    id: string;
    clientName: string;
    clientCity: string | null;
    clientAddress: string | null;
    venue: string | null;
    documentMode: "BUDGET" | "PROPOSAL" | "LOI";
    mirrorMode: boolean;
    currency: string;
    sectionCount: number;
    hasExcel: boolean;
    status: string;
    createdAt: string;
    updatedAt: string;
    screenCount: number;
    totalAmount: number;
}

interface ProjectCardProps {
    project: ProjectCardData;
    onImport: (id: string) => void;
    onDelete: (id: string) => void;
}

const modeBadgeConfig: Record<ProjectCardData["documentMode"], { label: string; bg: string; text: string }> = {
    BUDGET: { label: "Budget", bg: "bg-amber-100", text: "text-amber-700" },
    PROPOSAL: { label: "Proposal", bg: "bg-blue-100", text: "text-blue-700" },
    LOI: { label: "LOI", bg: "bg-green-100", text: "text-green-700" },
};

const getDocModeLabel = (mode: ProjectCardData["documentMode"]) => modeBadgeConfig[mode].label;

const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
        DRAFT: { label: "Draft", color: "#f59e0b" },
        PENDING_VERIFICATION: { label: "Pending", color: "#3b82f6" },
        APPROVED: { label: "Approved", color: "#10b981" },
        SIGNED: { label: "Signed", color: "#059669" },
    };
    return configs[status] || { label: status, color: "#71717a" };
};

const truncateText = (value: string, maxChars: number): string => {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars - 1)}...`;
};

const ProjectCard = ({ project, onImport: _onImport, onDelete }: ProjectCardProps) => {
    const router = useRouter();
    const status = getStatusConfig(project.status);
    const modeBadge = modeBadgeConfig[project.documentMode];
    const workflowBadge = project.mirrorMode
        ? { label: "Mirror", bg: "bg-gray-100", text: "text-gray-600" }
        : { label: "Intelligence", bg: "bg-purple-100", text: "text-purple-700" };
    const subtitle = [project.venue ? truncateText(project.venue, 25) : null, project.clientCity].filter(Boolean).join(" · ")
        || getDocModeLabel(project.documentMode);
    const title = truncateText(project.clientName, 30);
    const formattedTotal = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: project.currency || "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(project.totalAmount);
    const totalDisplay = project.totalAmount === 0 && !project.hasExcel ? "—" : formattedTotal;

    const handleClick = () => {
        router.push(`/projects/${project.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className="group relative bg-card border border-border overflow-hidden transition-all duration-300 hover:border-foreground/20 p-6 flex flex-col h-full min-h-[220px]"
        >
            <div className="flex items-start justify-between mb-5 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide ${modeBadge.bg} ${modeBadge.text}`}>
                        {modeBadge.label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${workflowBadge.bg} ${workflowBadge.text}`}>
                        {workflowBadge.label}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}80` }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground/80 transition-colors">
                        {status.label}
                    </span>
                </div>
            </div>

            <div className="space-y-1 pb-5 flex-1">
                <h3 className="text-xl font-normal text-card-foreground serif-vault group-hover:text-brand-blue transition-colors leading-tight truncate">
                    {title}
                </h3>
                <p className="text-xs text-muted-foreground group-hover:text-card-foreground/70 transition-colors truncate">
                    {subtitle}
                </p>
            </div>

            <div className="border-y border-border/40 py-3 flex items-center gap-4">
                {project.sectionCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        {project.hasExcel && <FileSpreadsheet className="w-3.5 h-3.5" />}
                        <span>{project.sectionCount} section{project.sectionCount !== 1 ? "s" : ""}</span>
                    </div>
                )}
                {project.screenCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>{project.screenCount} screen{project.screenCount !== 1 ? "s" : ""}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                </div>
            </div>

            <div className="flex items-end justify-between mt-auto pt-3 border-t border-border/40">
                <div className="text-2xl font-semibold text-foreground tracking-tight">
                    {totalDisplay}
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(project.id); }}
                        className="p-1 px-2 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
            </div>

            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#0A52EF]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

export default ProjectCard;
