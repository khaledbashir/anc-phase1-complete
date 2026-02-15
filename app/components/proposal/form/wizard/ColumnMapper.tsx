"use client";

/**
 * ColumnMapper — "Frankenstein" Excel normalizer UI
 *
 * When the standard parser can't read an uploaded Excel file,
 * this component lets the user manually map columns to roles
 * (Description, Selling Price, Cost, etc.) and extract pricing data.
 *
 * Flow:
 * 1. Shows all sheets from the uploaded workbook, ranked by score
 * 2. User picks a sheet → sees a data preview with column headers
 * 3. User assigns column roles via dropdowns
 * 4. Clicks "Apply Mapping" → builds PricingDocument → feeds into Mirror Mode
 */

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
    FileSpreadsheet,
    Columns,
    Check,
    ArrowRight,
    AlertTriangle,
    Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    analyzeSheets,
    buildPricingDocumentFromGrid,
    type SheetAnalysis,
    type ColumnRole,
    type ColumnMapping,
} from "@/services/pricing/excelNormalizer";
import type { PricingDocument } from "@/types/pricing";

// ============================================================================
// TYPES
// ============================================================================

interface ExcelPreviewSheet {
    name: string;
    grid: string[][];
    rowCount?: number;
    colCount?: number;
}

interface ColumnMapperProps {
    /** Sheet data from excelPreview (already parsed client-side) */
    sheets: ExcelPreviewSheet[];
    /** Original file name */
    fileName: string;
    /** Called when user confirms the mapping */
    onApply: (doc: PricingDocument, mapping: ColumnMapping) => void;
    /** Called when user cancels */
    onCancel: () => void;
}

const ROLE_OPTIONS: Array<{ value: ColumnRole | ""; label: string; color: string }> = [
    { value: "", label: "Skip", color: "text-muted-foreground" },
    { value: "description", label: "Description", color: "text-blue-500" },
    { value: "selling_price", label: "Selling Price", color: "text-emerald-500" },
    { value: "cost", label: "Cost", color: "text-orange-500" },
    { value: "margin_pct", label: "Margin %", color: "text-purple-500" },
    { value: "margin_dollar", label: "Margin $", color: "text-pink-500" },
];

const SECTION_MODES: Array<{ value: ColumnMapping["sectionMode"]; label: string; desc: string }> = [
    { value: "blank_rows", label: "Blank Rows", desc: "Sections separated by empty rows" },
    { value: "bold_text", label: "Section Headers", desc: "All-caps or text-only rows as headers" },
    { value: "single_table", label: "Single Table", desc: "Everything is one section" },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function ColumnMapper({ sheets, fileName, onApply, onCancel }: ColumnMapperProps) {
    // Analyze all sheets
    const analyses = useMemo(() => analyzeSheets(sheets), [sheets]);

    // State
    const [selectedSheet, setSelectedSheet] = useState<string>(analyses[0]?.sheetName || "");
    const [columnRoles, setColumnRoles] = useState<Record<number, ColumnRole | "">>({});
    const [headerRow, setHeaderRow] = useState(0);
    const [sectionMode, setSectionMode] = useState<ColumnMapping["sectionMode"]>("blank_rows");
    const [preview, setPreview] = useState<PricingDocument | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    // Current analysis for selected sheet
    const currentAnalysis = useMemo(
        () => analyses.find((a) => a.sheetName === selectedSheet) || null,
        [analyses, selectedSheet]
    );

    // Current sheet grid data
    const currentGrid = useMemo(
        () => sheets.find((s) => s.name === selectedSheet)?.grid || [],
        [sheets, selectedSheet]
    );

    // Apply suggestions when sheet changes
    useEffect(() => {
        if (currentAnalysis) {
            setColumnRoles(currentAnalysis.suggestions as Record<number, ColumnRole | "">);
            setHeaderRow(currentAnalysis.suggestedHeaderRow);
        }
    }, [currentAnalysis]);

    // Validation
    const hasDescription = Object.values(columnRoles).includes("description");
    const hasPrice = Object.values(columnRoles).includes("selling_price");
    const isValid = hasDescription && hasPrice;

    // Headers and data rows for display
    const displayHeaders = currentGrid[headerRow] || [];
    const displayRows = currentGrid
        .slice(headerRow + 1)
        .filter((row) => row.some((cell) => cell.trim() !== ""))
        .slice(0, 20);

    const setRole = useCallback((colIndex: number, role: ColumnRole | "") => {
        setColumnRoles((prev) => {
            const next = { ...prev };
            if (role === "") {
                delete next[colIndex];
            } else {
                next[colIndex] = role;
            }
            return next;
        });
        setShowPreview(false);
    }, []);

    const handlePreview = useCallback(() => {
        if (!isValid || currentGrid.length === 0) return;

        const mapping: ColumnMapping = {
            columns: columnRoles as Record<number, ColumnRole>,
            headerRow,
            sectionMode,
            sheetName: selectedSheet,
        };

        const doc = buildPricingDocumentFromGrid(currentGrid, mapping, fileName);
        setPreview(doc);
        setShowPreview(true);
    }, [isValid, currentGrid, columnRoles, headerRow, sectionMode, selectedSheet, fileName]);

    const handleApply = useCallback(() => {
        if (!preview) return;

        const mapping: ColumnMapping = {
            columns: columnRoles as Record<number, ColumnRole>,
            headerRow,
            sectionMode,
            sheetName: selectedSheet,
        };

        onApply(preview, mapping);
    }, [preview, columnRoles, headerRow, sectionMode, selectedSheet, onApply]);

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
        }).format(amount);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 px-6 py-4 border-b border-border bg-amber-500/5">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                        <Columns className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-foreground">Column Mapper</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            This file doesn&apos;t match the standard format. Map columns below to extract pricing data.
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Sheet tabs */}
                <div>
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2 block">
                        Select Sheet
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {analyses.map((a) => (
                            <button
                                key={a.sheetName}
                                onClick={() => setSelectedSheet(a.sheetName)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5",
                                    selectedSheet === a.sheetName
                                        ? "bg-[#0A52EF] text-white"
                                        : "border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                <FileSpreadsheet className="w-3 h-3" />
                                {a.sheetName}
                                {a.score > 30 && (
                                    <span className={cn(
                                        "text-[9px] px-1 rounded",
                                        selectedSheet === a.sheetName ? "bg-white/20" : "bg-emerald-500/10 text-emerald-500"
                                    )}>
                                        likely
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header row selector */}
                <div className="flex items-center gap-4">
                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1 block">
                            Header Row
                        </label>
                        <input
                            type="number"
                            value={headerRow + 1}
                            onChange={(e) => setHeaderRow(Math.max(0, parseInt(e.target.value) - 1) || 0)}
                            min={1}
                            max={currentGrid.length}
                            className="w-20 px-2 py-1.5 bg-background border border-border rounded text-sm text-center"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1 block">
                            Section Detection
                        </label>
                        <div className="flex gap-1">
                            {SECTION_MODES.map((mode) => (
                                <button
                                    key={mode.value}
                                    onClick={() => { setSectionMode(mode.value); setShowPreview(false); }}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded text-xs transition-all",
                                        sectionMode === mode.value
                                            ? "bg-[#0A52EF] text-white"
                                            : "border border-border text-muted-foreground hover:text-foreground"
                                    )}
                                    title={mode.desc}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column mapping table */}
                {currentGrid.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                {/* Column role selectors */}
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border">
                                        <th className="px-2 py-2 text-left text-[10px] text-muted-foreground font-semibold w-8">
                                            #
                                        </th>
                                        {displayHeaders.map((_, colIdx) => (
                                            <th key={colIdx} className="px-1 py-2 min-w-[120px]">
                                                <select
                                                    value={columnRoles[colIdx] || ""}
                                                    onChange={(e) => setRole(colIdx, e.target.value as ColumnRole | "")}
                                                    className={cn(
                                                        "w-full px-2 py-1 rounded border text-[11px] font-medium bg-background",
                                                        columnRoles[colIdx] === "description" && "border-blue-500/40 text-blue-500",
                                                        columnRoles[colIdx] === "selling_price" && "border-emerald-500/40 text-emerald-500",
                                                        columnRoles[colIdx] === "cost" && "border-orange-500/40 text-orange-500",
                                                        columnRoles[colIdx] === "margin_pct" && "border-purple-500/40 text-purple-500",
                                                        columnRoles[colIdx] === "margin_dollar" && "border-pink-500/40 text-pink-500",
                                                        !columnRoles[colIdx] && "border-border text-muted-foreground"
                                                    )}
                                                >
                                                    {ROLE_OPTIONS.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </th>
                                        ))}
                                    </tr>
                                    {/* Actual headers from the sheet */}
                                    <tr className="bg-muted/30 border-b border-border">
                                        <td className="px-2 py-1.5 text-muted-foreground font-mono text-[10px]">H</td>
                                        {displayHeaders.map((h, i) => (
                                            <td key={i} className="px-2 py-1.5 font-semibold text-foreground truncate max-w-[200px]">
                                                {h || <span className="text-muted-foreground italic">empty</span>}
                                            </td>
                                        ))}
                                    </tr>
                                </thead>
                                {/* Data rows */}
                                <tbody>
                                    {displayRows.map((row, rowIdx) => (
                                        <tr
                                            key={rowIdx}
                                            className={cn(
                                                "border-b border-border/50 hover:bg-muted/30",
                                                rowIdx % 2 === 0 ? "bg-background" : "bg-muted/10"
                                            )}
                                        >
                                            <td className="px-2 py-1 text-muted-foreground font-mono text-[10px]">
                                                {headerRow + rowIdx + 2}
                                            </td>
                                            {displayHeaders.map((_, colIdx) => {
                                                const val = row[colIdx] || "";
                                                const role = columnRoles[colIdx];
                                                return (
                                                    <td
                                                        key={colIdx}
                                                        className={cn(
                                                            "px-2 py-1 truncate max-w-[200px]",
                                                            role === "description" && "text-blue-400",
                                                            role === "selling_price" && "text-emerald-400 font-mono",
                                                            role === "cost" && "text-orange-400 font-mono",
                                                            role === "margin_pct" && "text-purple-400 font-mono",
                                                            role === "margin_dollar" && "text-pink-400 font-mono",
                                                            !role && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {val || <span className="text-muted-foreground/30">—</span>}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Validation warnings */}
                {!hasDescription && (
                    <div className="flex items-center gap-2 text-xs text-amber-500 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Assign a &quot;Description&quot; column to continue
                    </div>
                )}
                {!hasPrice && hasDescription && (
                    <div className="flex items-center gap-2 text-xs text-amber-500 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        Assign a &quot;Selling Price&quot; column to continue
                    </div>
                )}

                {/* Preview */}
                {showPreview && preview && (
                    <div className="border border-border rounded-xl p-4 bg-emerald-500/5 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-emerald-500">
                            <Check className="w-4 h-4" />
                            Mapping Preview
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                                <div className="text-muted-foreground">Sections</div>
                                <div className="text-foreground font-semibold text-lg">{preview.tables.length}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Line Items</div>
                                <div className="text-foreground font-semibold text-lg">{preview.metadata.itemsCount}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Total</div>
                                <div className="text-foreground font-semibold text-lg">{formatCurrency(preview.documentTotal)}</div>
                            </div>
                        </div>
                        {preview.tables.map((t, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                                <span className="font-medium text-foreground">{t.name}</span>
                                {" — "}{t.items.length} items, {formatCurrency(t.subtotal)}
                                {t.alternates.length > 0 && ` + ${t.alternates.length} alternate${t.alternates.length > 1 ? "s" : ""}`}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-6 py-3 border-t border-border flex items-center justify-between bg-background">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    Cancel
                </button>
                <div className="flex items-center gap-2">
                    {!showPreview ? (
                        <button
                            onClick={handlePreview}
                            disabled={!isValid}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-30 bg-muted text-foreground hover:bg-accent"
                        >
                            <Eye className="w-3.5 h-3.5" />
                            Preview
                        </button>
                    ) : (
                        <button
                            onClick={handleApply}
                            disabled={!preview || preview.tables.length === 0}
                            className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-medium transition-all bg-[#0A52EF] text-white hover:bg-[#0A52EF]/90 disabled:opacity-30"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Apply Mapping
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
