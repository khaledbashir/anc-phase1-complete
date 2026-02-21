"use client";

import React, { useMemo, useState } from "react";
import { TriagePage } from "../_lib/triageApi";
import { cn } from "@/lib/utils";
import { FilterTab } from "./FilterControls";
import { Check, CheckSquare, Square, ChevronUp, ChevronDown } from "lucide-react";

interface TriageTableProps {
    pages: TriagePage[];
    selectedPages: Set<number>;
    onToggleSelection: (pageNums: number[]) => void;
    activeTab: FilterTab;
    disabledCategories: Set<string>;
    onStatusChange: (pageNum: number, newStatus: TriagePage["recommended"]) => void;
}

type SortField = "page_num" | "score" | "classification" | "recommended";
type SortOrder = "asc" | "desc";

export default function TriageTable({
    pages,
    selectedPages,
    onToggleSelection,
    activeTab,
    disabledCategories,
    onStatusChange
}: TriageTableProps) {
    const [sortField, setSortField] = useState<SortField>("score");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // Filter logic
    const filteredPages = useMemo(() => {
        return pages.filter(p => {
            // Apply Recommendation Tab filter
            if (activeTab === "Keep" && p.recommended !== "keep") return false;
            if (activeTab === "Maybe" && p.recommended !== "maybe") return false;
            if (activeTab === "Discard" && p.recommended !== "discard") return false;
            if (activeTab === "Drawings" && p.classification !== "drawing") return false;
            return true;
        });
    }, [pages, activeTab]);

    // Sort logic
    const sortedPages = useMemo(() => {
        return [...filteredPages].sort((a, b) => {
            let sortVal = 0;
            if (sortField === "page_num") sortVal = a.page_num - b.page_num;
            if (sortField === "score") sortVal = a.score - b.score;
            if (sortField === "classification") sortVal = a.classification.localeCompare(b.classification);
            if (sortField === "recommended") sortVal = a.recommended.localeCompare(b.recommended);
            if (sortField === "source_filename") {
                const nameA = a.source_filename || "";
                const nameB = b.source_filename || "";
                sortVal = nameA.localeCompare(nameB);
            }

            return sortOrder === "asc" ? sortVal : -sortVal;
        });
    }, [filteredPages, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortOrder("desc"); // default desc for scores/page matching
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <div className="w-4 h-4 opacity-0" />;
        return sortOrder === "asc" ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />;
    };

    const isAllVisibleSelected = useMemo(() => {
        if (sortedPages.length === 0) return false;
        return sortedPages.every(p => selectedPages.has(p.page_num));
    }, [sortedPages, selectedPages]);

    const toggleSelectAllVisible = () => {
        if (isAllVisibleSelected) {
            // Unselect visible
            const visibleSet = new Set(sortedPages.map(p => p.page_num));
            const newSelection = Array.from(selectedPages).filter(num => !visibleSet.has(num));
            onToggleSelection(sortedPages.map(p => p.page_num));
        } else {
            // Select all visible (only those not already selected)
            const toSelect = sortedPages.filter(p => !selectedPages.has(p.page_num)).map(p => p.page_num);
            onToggleSelection(toSelect);
        }
    };

    // Category dimming logic
    const shouldDim = (page: TriagePage) => {
        if (page.classification === "drawing") return false; // Don't dim drawings
        if (page.matched_categories.length === 0) return false; // e.g. pure text, low score

        // If ALL matched categories for this page are disabled, dim it.
        return page.matched_categories.every(cat => disabledCategories.has(cat));
    };

    // Score color rendering
    const ScoreBadge = ({ score, type }: { score: number, type: string }) => {
        if (type === "drawing") return <span className="text-muted-foreground px-2 py-0.5 bg-muted rounded font-medium">-</span>;

        let colorCls = "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"; // default zero
        if (score >= 0.3) colorCls = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
        else if (score > 0) colorCls = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";

        return <span className={cn("px-2 py-0.5 rounded text-xs font-bold", colorCls)}>{score.toFixed(3)}</span>;
    };

    // Check if we have multiple files
    const hasMultipleFiles = pages.some(p => p.source_filename);

    return (
        <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden max-h-[800px]">
            {/* Batch Action Toolbar */}
            <div className="bg-muted/30 border-b border-border p-3 flex flex-wrap gap-3 items-center text-sm">
                <span className="font-medium text-foreground mr-2">Batch Actions:</span>
                <button
                    onClick={toggleSelectAllVisible}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-background border border-border hover:bg-muted transition-colors"
                >
                    {isAllVisibleSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                    {isAllVisibleSelected ? "Deselect Visible" : "Select Visible"}
                </button>
                <div className="w-px h-5 bg-border mx-1" />
                <button
                    onClick={() => onToggleSelection(pages.filter(p => p.recommended === "keep").map(p => p.page_num))}
                    className="px-3 py-1.5 rounded text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                >
                    Select All "Keep"
                </button>
                <button
                    onClick={() => onToggleSelection(pages.filter(p => p.recommended === "maybe").map(p => p.page_num))}
                    className="px-3 py-1.5 rounded text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors"
                >
                    Select All "Maybe"
                </button>
                <button
                    onClick={() => {
                        // Unselect everything. 
                        onToggleSelection(Array.from(selectedPages)); // toggling all currently selected = clears them
                    }}
                    className="px-3 py-1.5 rounded text-muted-foreground hover:bg-muted transition-colors ml-auto"
                >
                    Clear All Selection
                </button>
            </div>

            {/* Table Container */}
            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="p-3 w-12 text-center text-muted-foreground font-medium">
                                <button onClick={toggleSelectAllVisible} className="focus:outline-none">
                                    {isAllVisibleSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                                </button>
                            </th>
                            {hasMultipleFiles && (
                                <th className="p-3 w-48 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("source_filename")}>
                                    <div className="flex items-center">File <SortIcon field="source_filename" /></div>
                                </th>
                            )}
                            <th className="p-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("page_num")}>
                                <div className="flex items-center">Page <SortIcon field="page_num" /></div>
                            </th>
                            <th className="p-3 w-24 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("score")}>
                                <div className="flex items-center">Score <SortIcon field="score" /></div>
                            </th>
                            <th className="p-3 w-28 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("classification")}>
                                <div className="flex items-center">Type <SortIcon field="classification" /></div>
                            </th>
                            <th className="p-3 min-w-[200px] font-medium text-muted-foreground">Keywords</th>
                            <th className="p-3 max-w-[300px] font-medium text-muted-foreground">Snippet</th>
                            <th className="p-3 w-40 font-medium text-muted-foreground cursor-pointer hover:text-foreground" onClick={() => handleSort("recommended")}>
                                <div className="flex items-center">Status <SortIcon field="recommended" /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sortedPages.map((page) => {
                            const isSelected = selectedPages.has(page.page_num);
                            const dim = shouldDim(page);

                            return (
                                <tr
                                    key={page.page_num}
                                    className={cn(
                                        "group transition-colors hover:bg-muted/30",
                                        isSelected ? "bg-primary/5 hover:bg-primary/10" : "",
                                        dim ? "opacity-40 hover:opacity-100" : ""
                                    )}
                                >
                                    <td className="p-3 text-center align-top pt-4">
                                        <button
                                            onClick={() => onToggleSelection([page.page_num])}
                                            className="focus:outline-none"
                                        >
                                            {isSelected
                                                ? <CheckSquare className="w-4 h-4 text-primary" />
                                                : <Square className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100" />}
                                        </button>
                                    </td>
                                    {hasMultipleFiles && (
                                        <td className="p-3 align-top pt-4 text-xs font-medium text-muted-foreground max-w-[12rem] truncate" title={page.source_filename}>
                                            {page.source_filename}
                                        </td>
                                    )}
                                    <td className="p-3 align-top pt-4 font-mono font-medium">{page.page_num}</td>
                                    <td className="p-3 align-top pt-3.5">
                                        <ScoreBadge score={page.score} type={page.classification} />
                                    </td>
                                    <td className="p-3 align-top pt-3.5">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                            page.classification === "drawing"
                                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                                : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300"
                                        )}>
                                            {page.classification}
                                        </span>
                                    </td>
                                    <td className="p-3 align-top">
                                        <div className="flex flex-wrap gap-1.5 mt-0.5">
                                            {page.matched_keywords.slice(0, 5).map((kw, i) => (
                                                <span key={i} className="px-1.5 py-0.5 block bg-muted border border-border rounded text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {kw}
                                                </span>
                                            ))}
                                            {page.matched_keywords.length > 5 && (
                                                <span className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] text-muted-foreground">
                                                    +{page.matched_keywords.length - 5}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-3 align-top max-w-[300px]">
                                        <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mt-0.5" title={page.snippet}>
                                            {page.snippet || <span className="italic opacity-50">No text content</span>}
                                        </p>
                                    </td>
                                    <td className="p-3 align-top">
                                        <select
                                            value={page.recommended}
                                            onChange={(e) => onStatusChange(page.page_num, e.target.value as any)}
                                            className={cn(
                                                "w-full bg-background border rounded px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-primary focus:border-primary outline-none mt-0.5 cursor-pointer appearance-none",
                                                page.recommended === "keep" ? "border-green-500/50 text-green-700 dark:text-green-400" :
                                                    page.recommended === "maybe" ? "border-yellow-500/50 text-yellow-700 dark:text-yellow-400" :
                                                        page.recommended === "review" ? "border-blue-500/50 text-blue-700 dark:text-blue-400" :
                                                            "border-border text-muted-foreground"
                                            )}
                                        >
                                            <option value="keep">✓ Keep</option>
                                            <option value="maybe">? Maybe</option>
                                            <option value="review">👁 Review</option>
                                            <option value="discard">✕ Discard</option>
                                        </select>
                                    </td>
                                </tr>
                            );
                        })}
                        {sortedPages.length === 0 && (
                            <tr>
                                <td colSpan={hasMultipleFiles ? 8 : 7} className="p-8 text-center text-muted-foreground">
                                    No pages match the current filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
