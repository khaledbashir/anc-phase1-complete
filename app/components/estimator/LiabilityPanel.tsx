"use client";

import React, { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
    Shield,
    Upload,
    FileText,
    CheckCircle,
    AlertTriangle,
    XCircle,
    X,
    Loader2,
    ChevronDown,
    ChevronRight,
} from "lucide-react";

interface LiabilityCheck {
    id: string;
    category: "financial" | "legal" | "scope" | "timeline" | "warranty";
    name: string;
    description: string;
    severity: "critical" | "warning" | "info";
    keywords: string[];
    foundText?: string;
    status: "found" | "missing" | "flagged";
    recommendation: string;
}

interface ScanResult {
    documentName: string;
    totalChecks: number;
    passed: number;
    warnings: number;
    critical: number;
    checks: LiabilityCheck[];
    riskScore: number;
    scannedAt: string;
}

interface LiabilityPanelProps {
    open: boolean;
    onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
    financial: "Financial",
    legal: "Legal",
    scope: "Scope",
    timeline: "Timeline",
    warranty: "Warranty",
};

const CATEGORY_ORDER = ["financial", "legal", "scope", "timeline", "warranty"];

function StatusIcon({ status }: { status: LiabilityCheck["status"] }) {
    if (status === "found")
        return <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />;
    if (status === "flagged")
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
    return <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
}

function RiskBadge({ score }: { score: number }) {
    const color =
        score <= 30
            ? "bg-emerald-100 text-emerald-700"
            : score <= 60
              ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700";
    const label = score <= 30 ? "Low Risk" : score <= 60 ? "Medium Risk" : "High Risk";

    return (
        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold", color)}>
            <Shield className="h-3.5 w-3.5" />
            {score}/100 — {label}
        </div>
    );
}

export default function LiabilityPanel({ open, onClose }: LiabilityPanelProps) {
    const [mode, setMode] = useState<"upload" | "paste">("upload");
    const [pasteText, setPasteText] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleCheck = useCallback((id: string) => {
        setExpandedChecks((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const handleFileScan = useCallback(async (file: File) => {
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/sow/scan", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Scan failed: ${res.status}`);
            }

            const data = await res.json();
            setResult(data.result);
        } catch (err: any) {
            setError(err.message || "Failed to scan document");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleTextScan = useCallback(async () => {
        if (!pasteText.trim()) {
            setError("Paste some text to scan");
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/sow/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: pasteText,
                    documentName: "Pasted Text",
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Scan failed: ${res.status}`);
            }

            const data = await res.json();
            setResult(data.result);
        } catch (err: any) {
            setError(err.message || "Failed to scan text");
        } finally {
            setLoading(false);
        }
    }, [pasteText]);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFileScan(file);
        },
        [handleFileScan]
    );

    const handleReset = useCallback(() => {
        setResult(null);
        setError(null);
        setPasteText("");
        setExpandedChecks(new Set());
    }, []);

    if (!open) return null;

    const groupedChecks = result
        ? CATEGORY_ORDER.map((cat) => ({
              category: cat,
              label: CATEGORY_LABELS[cat],
              checks: result.checks.filter((c) => c.category === cat),
          })).filter((g) => g.checks.length > 0)
        : [];

    return (
        <div className="flex flex-col h-full w-full bg-white">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
                    <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[#0A52EF]" />
                        <h2 className="text-base font-semibold text-[#1C1C1C]">
                            Liability Scanner
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-[#F7F7F7] text-[#878787]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {!result && !loading && (
                        <div className="px-5 py-4 space-y-4">
                            {/* Mode toggle */}
                            <div className="flex rounded border border-[#E8E8E8] overflow-hidden text-xs">
                                <button
                                    onClick={() => setMode("upload")}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 transition-colors",
                                        mode === "upload"
                                            ? "bg-[#1C1C1C] text-white"
                                            : "bg-white text-[#616161] hover:bg-[#F7F7F7]"
                                    )}
                                >
                                    Upload File
                                </button>
                                <button
                                    onClick={() => setMode("paste")}
                                    className={cn(
                                        "flex-1 px-3 py-1.5 transition-colors",
                                        mode === "paste"
                                            ? "bg-[#1C1C1C] text-white"
                                            : "bg-white text-[#616161] hover:bg-[#F7F7F7]"
                                    )}
                                >
                                    Paste Text
                                </button>
                            </div>

                            {mode === "upload" && (
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={cn(
                                        "border-2 border-dashed rounded p-8 text-center cursor-pointer transition-colors",
                                        dragOver
                                            ? "border-[#0A52EF] bg-blue-50/30"
                                            : "border-[#E8E8E8] hover:border-[#878787]"
                                    )}
                                >
                                    <Upload className="h-8 w-8 mx-auto mb-2 text-[#878787]" />
                                    <p className="text-sm text-[#1C1C1C] font-medium">
                                        Drop a PDF or text file here
                                    </p>
                                    <p className="text-xs text-[#878787] mt-1">
                                        or click to browse
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf,.txt,.md,.docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileScan(file);
                                        }}
                                    />
                                </div>
                            )}

                            {mode === "paste" && (
                                <div className="space-y-3">
                                    <textarea
                                        value={pasteText}
                                        onChange={(e) =>
                                            setPasteText(e.target.value)
                                        }
                                        placeholder="Paste SOW, RFP, or contract text here…"
                                        rows={12}
                                        className="w-full px-3 py-2 text-sm border border-[#E8E8E8] rounded focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787] resize-none"
                                    />
                                    <button
                                        onClick={handleTextScan}
                                        disabled={!pasteText.trim()}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded bg-[#1C1C1C] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                                    >
                                        <Shield className="h-4 w-4" />
                                        Scan for Liabilities
                                    </button>
                                </div>
                            )}

                            {error && (
                                <p className="text-xs text-red-600">{error}</p>
                            )}
                        </div>
                    )}

                    {loading && (
                        <div className="flex flex-col items-center justify-center h-64 text-[#878787]">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <p className="text-sm">
                                Scanning document against 20-point checklist…
                            </p>
                        </div>
                    )}

                    {result && (
                        <div className="px-5 py-4 space-y-4">
                            {/* Summary */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-[#878787]" />
                                    <span className="text-sm font-medium text-[#1C1C1C] truncate">
                                        {result.documentName}
                                    </span>
                                </div>

                                <RiskBadge score={result.riskScore} />

                                <div className="flex gap-4 text-xs">
                                    <span className="text-emerald-600 font-medium">
                                        {result.passed} passed
                                    </span>
                                    <span className="text-amber-600 font-medium">
                                        {result.warnings} warnings
                                    </span>
                                    <span className="text-red-600 font-medium">
                                        {result.critical} critical
                                    </span>
                                </div>
                            </div>

                            {/* Grouped checks */}
                            {groupedChecks.map((group) => (
                                <div key={group.category}>
                                    <h3 className="text-xs font-semibold text-[#878787] uppercase tracking-wider mb-2">
                                        {group.label}
                                    </h3>
                                    <div className="space-y-1">
                                        {group.checks.map((check) => {
                                            const isExpanded =
                                                expandedChecks.has(check.id);
                                            return (
                                                <div
                                                    key={check.id}
                                                    className="border border-[#E8E8E8] rounded"
                                                >
                                                    <button
                                                        onClick={() =>
                                                            toggleCheck(
                                                                check.id
                                                            )
                                                        }
                                                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#F7F7F7] transition-colors"
                                                    >
                                                        <StatusIcon
                                                            status={
                                                                check.status
                                                            }
                                                        />
                                                        <span className="text-sm text-[#1C1C1C] flex-1">
                                                            {check.name}
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-3.5 w-3.5 text-[#878787]" />
                                                        ) : (
                                                            <ChevronRight className="h-3.5 w-3.5 text-[#878787]" />
                                                        )}
                                                    </button>
                                                    {isExpanded && (
                                                        <div className="px-3 pb-3 pt-1 border-t border-[#E8E8E8]">
                                                            <p className="text-xs text-[#616161] mb-2">
                                                                {
                                                                    check.recommendation
                                                                }
                                                            </p>
                                                            {check.foundText && (
                                                                <div className="bg-[#F7F7F7] rounded px-2 py-1.5">
                                                                    <p className="text-[10px] text-[#878787] mb-0.5">
                                                                        Matched
                                                                        excerpt:
                                                                    </p>
                                                                    <p className="text-xs text-[#1C1C1C] italic">
                                                                        &ldquo;…
                                                                        {
                                                                            check.foundText
                                                                        }
                                                                        …&rdquo;
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Scan another */}
                            <button
                                onClick={handleReset}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded border border-[#E8E8E8] text-sm text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                            >
                                Scan Another Document
                            </button>
                        </div>
                    )}
                </div>
        </div>
    );
}
