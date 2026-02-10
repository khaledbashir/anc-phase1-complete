"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowUpRight,
    Clock,
    Download,
    FileSpreadsheet,
    Loader2,
    MonitorPlay,
    Sparkles,
    Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type DashboardStatus = "DRAFT" | "SHARED" | "APPROVED" | "SIGNED" | "CANCELLED";

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
    onStatusChange: (id: string, status: DashboardStatus) => Promise<void> | void;
    onBriefMe: (id: string) => void;
    onDelete?: (id: string) => void;
}

const modeBadgeConfig: Record<ProjectCardData["documentMode"], { label: string }> = {
    BUDGET: { label: "Budget" },
    PROPOSAL: { label: "Proposal" },
    LOI: { label: "LOI" },
};

const statusConfig: Record<string, { label: string; accent: string }> = {
    DRAFT: { label: "Draft", accent: "bg-zinc-400" },
    SHARED: { label: "Sent", accent: "bg-blue-500" },
    APPROVED: { label: "Approved", accent: "bg-emerald-500" },
    SIGNED: { label: "Signed", accent: "bg-emerald-600" },
    CANCELLED: { label: "Lost", accent: "bg-zinc-300" },
    PENDING_VERIFICATION: { label: "Pending", accent: "bg-blue-400" },
    AUDIT: { label: "Audit", accent: "bg-amber-500" },
    CLOSED: { label: "Closed", accent: "bg-zinc-300" },
    ARCHIVED: { label: "Archived", accent: "bg-zinc-300" },
};

const statusOptions: Array<{ value: DashboardStatus; label: string }> = [
    { value: "DRAFT", label: "Draft" },
    { value: "SHARED", label: "Sent" },
    { value: "APPROVED", label: "Approved" },
    { value: "SIGNED", label: "Signed" },
    { value: "CANCELLED", label: "Lost" },
];

const getDocModeLabel = (mode: ProjectCardData["documentMode"]) => modeBadgeConfig[mode]?.label || mode;

const truncateText = (value: string, maxChars: number): string => {
    if (value.length <= maxChars) return value;
    return `${value.slice(0, maxChars - 1)}...`;
};

const formatCurrency = (amount: number, currency: string = "USD") =>
    new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);

const formatDateStamp = () => {
    const now = new Date();
    return `${now.getMonth() + 1}-${now.getDate()}-${now.getFullYear()}`;
};

const safeFileName = (value: string) =>
    value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "Project";

export default function ProjectCard({ project, onStatusChange, onBriefMe, onDelete }: ProjectCardProps) {
    const router = useRouter();
    const workflowLabel = project.mirrorMode ? "Mirror" : "Intelligence";

    const status = statusConfig[project.status] || { label: project.status, accent: "bg-zinc-400" };
    const selectedStatus: DashboardStatus = (() => {
        if (project.status === "SHARED" || project.status === "APPROVED" || project.status === "SIGNED" || project.status === "CANCELLED" || project.status === "DRAFT") {
            return project.status;
        }
        if (project.status === "PENDING_VERIFICATION" || project.status === "AUDIT") return "SHARED";
        if (project.status === "CLOSED" || project.status === "ARCHIVED") return "SIGNED";
        return "DRAFT";
    })();

    const subtitle =
        [project.venue ? truncateText(project.venue, 25) : null, project.clientCity].filter(Boolean).join(" · ") ||
        getDocModeLabel(project.documentMode);

    const title = truncateText(project.clientName, 30);
    const totalDisplay = project.totalAmount === 0 && !project.hasExcel ? "—" : formatCurrency(project.totalAmount, project.currency || "USD");

    const [isExporting, setIsExporting] = useState(false);
    const [isStatusUpdating, setIsStatusUpdating] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [quickViewVisible, setQuickViewVisible] = useState(false);
    const [quickViewPinned, setQuickViewPinned] = useState(false);
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const quickSummary = useMemo(() => {
        return `${project.sectionCount} sections · ${project.screenCount} screens`;
    }, [project.sectionCount, project.screenCount]);

    const clearHoverTimer = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    };

    const handleQuickExport = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (isExporting) return;

        try {
            setIsExporting(true);
            const res = await fetch(`/api/projects/${project.id}/pdf`, { method: "POST" });
            
            // Check if response is OK
            if (!res.ok) {
                const errorText = await res.text();
                console.error("PDF export failed:", errorText);
                alert("PDF export failed. Please try opening the project and exporting from there.");
                return;
            }
            
            // Verify the response is actually a PDF
            const contentType = res.headers.get("content-type");
            if (!contentType?.includes("application/pdf")) {
                console.error("Response is not a PDF:", contentType);
                alert("PDF export failed — unexpected response format.");
                return;
            }
            
            const blob = await res.blob();
            
            // Verify blob has content
            if (blob.size === 0) {
                console.error("PDF blob is empty");
                alert("PDF export failed — generated PDF is empty.");
                return;
            }
            
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `ANC_${safeFileName(project.clientName)}_${project.documentMode}_${formatDateStamp()}.pdf`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Quick PDF export failed:", err);
            alert("PDF export failed. Please try again or export from the project page.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div
            onClick={() => router.push(`/projects/${project.id}`)}
            onMouseEnter={() => {
                clearHoverTimer();
                hoverTimerRef.current = setTimeout(() => setQuickViewVisible(true), 1500);
            }}
            onMouseLeave={() => {
                clearHoverTimer();
                if (!quickViewPinned) setQuickViewVisible(false);
            }}
            className="group relative bg-card border border-border overflow-visible cursor-pointer transition-colors duration-150 hover:bg-accent flex flex-col h-full min-h-[220px] rounded"
        >
            {/* Status accent — thin left bar */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-[2px]", status.accent, "opacity-40 group-hover:opacity-100 transition-opacity duration-150")} />

            <div className="p-5 pl-6 flex flex-col h-full">
                {/* Header: meta line */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground tracking-wide">
                        <span className="uppercase font-medium">{getDocModeLabel(project.documentMode)}</span>
                        <span className="text-border">·</span>
                        <span>{workflowLabel}</span>
                        <span className="text-border">·</span>
                        <span>{status.label}</span>
                        {isStatusUpdating && <Loader2 className="w-3 h-3 animate-spin" />}
                    </div>

                    <select
                        value={selectedStatus}
                        onClick={(e) => e.stopPropagation()}
                        onChange={async (e) => {
                            const nextStatus = e.target.value as DashboardStatus;
                            setStatusError(null);
                            setIsStatusUpdating(true);
                            try {
                                await onStatusChange(project.id, nextStatus);
                            } catch (err: any) {
                                setStatusError(err?.message || "Status update failed");
                            } finally {
                                setIsStatusUpdating(false);
                            }
                        }}
                        className="h-6 px-1.5 rounded-sm border border-transparent hover:border-border bg-transparent text-[10px] text-muted-foreground cursor-pointer focus:border-border focus:outline-none transition-colors"
                        aria-label="Change project status"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Title + subtitle */}
                <div className="flex-1 min-h-0">
                    <h3 className="text-[15px] font-medium text-card-foreground leading-snug truncate">
                        {title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {subtitle}
                    </p>
                    {statusError && <p className="text-[10px] text-red-500 mt-1 truncate">{statusError}</p>}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-4 mb-3">
                    {project.sectionCount > 0 && (
                        <div className="flex items-center gap-1">
                            {project.hasExcel && <FileSpreadsheet className="w-3 h-3" />}
                            <span>{project.sectionCount} section{project.sectionCount !== 1 ? "s" : ""}</span>
                        </div>
                    )}
                    {project.screenCount > 0 && (
                        <div className="flex items-center gap-1">
                            <MonitorPlay className="w-3 h-3" />
                            <span>{project.screenCount} screen{project.screenCount !== 1 ? "s" : ""}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                    </div>
                </div>

                {/* Footer: value + actions */}
                <div className="flex items-end justify-between pt-3 border-t border-border/40">
                    <div className="text-lg font-medium text-foreground tracking-tight tabular-nums">{totalDisplay}</div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            onClick={(e) => { e.stopPropagation(); onBriefMe(project.id); }}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-sm transition-colors"
                            title="Brief Me"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={handleQuickExport}
                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-sm transition-colors"
                            title="Export PDF"
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </button>
                        {onDelete && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm("Are you sure you want to delete this project?")) {
                                        onDelete(project.id);
                                    }
                                }}
                                className="p-1.5 text-muted-foreground hover:text-destructive rounded-sm transition-colors"
                                title="Delete"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <ArrowUpRight className="w-3.5 h-3.5 ml-0.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                </div>
            </div>

            {/* Quick View Popover */}
            {(quickViewVisible || quickViewPinned) && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-40 top-2 right-2 w-72 rounded border border-border bg-card p-4 shadow-sm"
                >
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{getDocModeLabel(project.documentMode)} · {workflowLabel}</div>
                    <div className="text-sm font-semibold text-foreground mt-1 truncate">{project.clientName}</div>
                    <div className="text-xs text-muted-foreground mt-2">{quickSummary}</div>
                    <div className="text-sm font-semibold text-foreground mt-1">{formatCurrency(project.totalAmount, project.currency || "USD")}</div>
                    <div className="text-[11px] text-muted-foreground mt-2">
                        Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })} · {status.label}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="px-3 py-1.5 text-xs rounded-sm border border-border text-foreground hover:bg-muted transition-colors"
                        >
                            Open
                        </button>
                        <button
                            onClick={handleQuickExport}
                            className="px-3 py-1.5 text-xs rounded-sm border border-border text-foreground hover:bg-muted transition-colors"
                        >
                            Export PDF
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
