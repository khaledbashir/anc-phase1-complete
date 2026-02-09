"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowUpRight,
    Clock,
    Download,
    FileSpreadsheet,
    Info,
    Loader2,
    MonitorPlay,
    Sparkles,
    Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

const modeBadgeConfig: Record<ProjectCardData["documentMode"], { label: string; bg: string; text: string }> = {
    BUDGET: { label: "Budget", bg: "bg-amber-100", text: "text-amber-700" },
    PROPOSAL: { label: "Proposal", bg: "bg-blue-100", text: "text-blue-700" },
    LOI: { label: "LOI", bg: "bg-green-100", text: "text-green-700" },
};

const statusPillConfig: Record<string, { label: string; className: string }> = {
    DRAFT: { label: "Draft", className: "bg-gray-200 text-gray-700" },
    SHARED: { label: "Sent", className: "bg-blue-100 text-blue-700" },
    APPROVED: { label: "Approved", className: "bg-green-100 text-green-700" },
    SIGNED: { label: "Signed", className: "bg-emerald-200 text-emerald-800" },
    CANCELLED: { label: "Lost", className: "bg-red-100 text-red-700" },
    PENDING_VERIFICATION: { label: "Pending", className: "bg-blue-100 text-blue-700" },
    AUDIT: { label: "Audit", className: "bg-violet-100 text-violet-700" },
    CLOSED: { label: "Closed", className: "bg-zinc-200 text-zinc-700" },
    ARCHIVED: { label: "Archived", className: "bg-zinc-200 text-zinc-700" },
};

const statusOptions: Array<{ value: DashboardStatus; label: string }> = [
    { value: "DRAFT", label: "Draft" },
    { value: "SHARED", label: "Sent" },
    { value: "APPROVED", label: "Approved" },
    { value: "SIGNED", label: "Signed" },
    { value: "CANCELLED", label: "Lost" },
];

const getDocModeLabel = (mode: ProjectCardData["documentMode"]) => modeBadgeConfig[mode].label;

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
    const modeBadge = modeBadgeConfig[project.documentMode];
    const workflowBadge = project.mirrorMode
        ? { label: "Mirror", bg: "bg-gray-100", text: "text-gray-600" }
        : { label: "Intelligence", bg: "bg-purple-100", text: "text-purple-700" };

    const statusPill = statusPillConfig[project.status] || {
        label: project.status,
        className: "bg-zinc-200 text-zinc-700",
    };
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
            className="group relative bg-card border border-border overflow-visible transition-all duration-300 hover:border-foreground/20 p-6 flex flex-col h-full min-h-[230px]"
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
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${statusPill.className}`}>
                        {statusPill.label}
                    </span>
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
                        className="h-7 px-2 rounded border border-border bg-background text-[10px] text-muted-foreground"
                        aria-label="Change project status"
                    >
                        {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {isStatusUpdating && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
            </div>

            <div className="space-y-1 pb-5 flex-1">
                <h3 className="text-xl font-normal text-card-foreground serif-vault group-hover:text-brand-blue transition-colors leading-tight truncate">
                    {title}
                </h3>
                <p className="text-xs text-muted-foreground group-hover:text-card-foreground/70 transition-colors truncate">
                    {subtitle}
                </p>
                {statusError && <p className="text-[10px] text-red-600 truncate">{statusError}</p>}
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
                <div className="text-2xl font-semibold text-foreground tracking-tight">{totalDisplay}</div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setQuickViewPinned((prev) => !prev);
                            setQuickViewVisible(true);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        title="Project Quick View"
                    >
                        <Info className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onBriefMe(project.id);
                        }}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        title="Brief Me"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleQuickExport}
                        className="p-2 text-muted-foreground hover:text-foreground"
                        title="Quick Export PDF"
                        disabled={isExporting}
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </button>
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm("Are you sure you want to delete this project?")) {
                                    onDelete(project.id);
                                }
                            }}
                            className="p-2 text-muted-foreground hover:text-red-500"
                            title="Delete Project"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
            </div>

            {(quickViewVisible || quickViewPinned) && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute z-40 top-3 right-3 w-80 rounded-lg border border-border bg-background/98 backdrop-blur p-3 shadow-2xl"
                >
                    <div className="text-xs font-semibold text-muted-foreground mb-1">{getDocModeLabel(project.documentMode)}</div>
                    <div className="text-sm font-semibold text-foreground truncate">{project.clientName}</div>
                    <div className="text-xs text-muted-foreground mt-2">{quickSummary}</div>
                    <div className="text-sm text-foreground mt-1">{formatCurrency(project.totalAmount, project.currency || "USD")}</div>
                    <div className="text-xs text-muted-foreground mt-1">{project.mirrorMode ? "Mirror Mode · Excel imported" : "Intelligence Mode"}</div>
                    <div className="text-xs text-muted-foreground mt-2">
                        Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
                    </div>
                    <div className="text-xs text-muted-foreground">Status: {statusPill.label}</div>
                    <div className="mt-3 flex items-center gap-2">
                        <button
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="px-2.5 py-1.5 text-xs rounded border border-border text-foreground hover:bg-muted"
                        >
                            Open Project
                        </button>
                        <button
                            onClick={handleQuickExport}
                            className="px-2.5 py-1.5 text-xs rounded border border-border text-foreground hover:bg-muted"
                        >
                            Quick Export PDF
                        </button>
                    </div>
                </div>
            )}

            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#0A52EF]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}
