"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    Layers,
    Trash2,
    ArrowUpRight,
    FileDigit,
    Clock,
    DollarSign,
    MonitorPlay
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Project {
    id: string;
    clientName: string;
    proposalName: string | null;
    clientLogo?: string | null;
    status: string;
    documentType?: string;
    documentMode?: "BUDGET" | "PROPOSAL" | "LOI";
    pricingType?: string;
    createdAt: string;
    updatedAt: string;
    lastSavedAt: string | null;
    screenCount?: number;
    documentCount?: number;
    totalAmount?: number;
}

interface ProjectCardProps {
    project: Project;
    onImport: (id: string) => void;
    onDelete: (id: string) => void;
}

const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
        DRAFT: { label: "Draft", color: "#f59e0b" },
        PENDING_VERIFICATION: { label: "Pending", color: "#3b82f6" },
        APPROVED: { label: "Approved", color: "#10b981" },
        SIGNED: { label: "Signed", color: "#059669" },
    };
    return configs[status] || { label: status, color: "#71717a" };
};

const ProjectCard = ({ project, onDelete }: ProjectCardProps) => {
    const router = useRouter();
    const status = getStatusConfig(project.status);

    const handleClick = () => {
        router.push(`/projects/${project.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className="group relative bg-card border border-border overflow-hidden transition-all duration-300 hover:border-foreground/20 p-6 flex flex-col h-full min-h-[220px]"
        >
            {/* Minimal Icon Area */}
            <div className="flex items-start justify-between mb-8">
                <div className="w-10 h-10 bg-muted border border-border rounded flex items-center justify-center">
                    {project.clientLogo ? (
                        <Image 
                            src={project.clientLogo} 
                            alt={project.clientName} 
                            width={24}
                            height={24}
                            className="w-6 h-6 object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all" 
                        />
                    ) : (
                        <Layers className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.color, boxShadow: `0 0 8px ${status.color}80` }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground/80 transition-colors">
                        {status.label}
                    </span>
                </div>
            </div>

            {/* Title Section */}
            <div className="space-y-1 py-4 flex-1">
                <h3 className="text-xl font-normal text-card-foreground serif-vault group-hover:text-brand-blue transition-colors leading-tight">
                    {project.clientName}
                </h3>
                <p className="text-xs text-muted-foreground group-hover:text-card-foreground/70 transition-colors">
                    {project.proposalName || (project.documentMode === "LOI" ? "LOI" : project.documentMode === "PROPOSAL" ? "Proposal" : "Budget")}
                </p>
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-4 mt-4 mb-3">
                {project.documentCount !== undefined && project.documentCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <FileDigit className="w-3.5 h-3.5" />
                        <span>{project.documentCount} doc{project.documentCount !== 1 ? 's' : ''}</span>
                    </div>
                )}
                {project.screenCount !== undefined && project.screenCount > 0 && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>{project.screenCount} screen{project.screenCount !== 1 ? 's' : ''}</span>
                    </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                </div>
            </div>

            {/* Footer Metrics */}
            <div className="flex items-end justify-between mt-auto pt-3 border-t border-border/40">
                <div className="space-y-1">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Budget</div>
                    <div className="text-sm font-medium text-foreground flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5" />
                        {project.totalAmount ? project.totalAmount.toLocaleString() : '0.00'}
                    </div>
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

            {/* Subtle Hover Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#0A52EF]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
};

export default ProjectCard;
