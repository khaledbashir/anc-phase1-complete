"use client";

import React, { useState, useMemo, useCallback } from "react";
import { X, Check, ChevronDown, ArrowRight, Save, Table2, MousePointerClick, Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RawSheetPreview, ColumnMapping } from "@/services/import/excelNormalizer";
import { colIndexToLetter } from "@/services/import/columnUtils";

// ============================================================================
// TYPES
// ============================================================================

interface MappingWizardProps {
    fingerprint: string;
    rawPreview: RawSheetPreview[];
    fileName: string;
    file: File;
    onComplete: (result: any) => void;
    onCancel: () => void;
}

type WizardStep = "select_sheet" | "select_header" | "map_columns" | "confirm";

const MAPPABLE_FIELDS: { key: string; label: string; required: boolean }[] = [
    { key: "description", label: "Description / Name", required: true },
    { key: "sellingPrice", label: "Selling Price", required: false },
    { key: "totalCost", label: "Total Cost", required: false },
    { key: "quantity", label: "Quantity", required: false },
    { key: "unitPrice", label: "Unit Price", required: false },
    { key: "margin", label: "Margin $", required: false },
    { key: "marginPct", label: "Margin %", required: false },
    { key: "pitch", label: "Pixel Pitch (mm)", required: false },
    { key: "widthFt", label: "Width (ft)", required: false },
    { key: "heightFt", label: "Height (ft)", required: false },
];

// ============================================================================
// COMPONENT
// ============================================================================

export default function MappingWizard({
    fingerprint,
    rawPreview,
    fileName,
    file,
    onComplete,
    onCancel,
}: MappingWizardProps) {
    const [step, setStep] = useState<WizardStep>(
        rawPreview.length === 1 ? "select_header" : "select_sheet",
    );
    const [selectedSheet, setSelectedSheet] = useState<string>(
        rawPreview[0]?.sheetName || "",
    );
    const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
    const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
    const [dataEndStrategy, setDataEndStrategy] = useState("blank_row");
    const [profileName, setProfileName] = useState(
        fileName.replace(/\.xlsx?$/i, "").replace(/[_-]/g, " ").trim() + " Format",
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activePreview = useMemo(
        () => rawPreview.find((p) => p.sheetName === selectedSheet) || rawPreview[0],
        [rawPreview, selectedSheet],
    );

    const headerCells = useMemo(() => {
        if (headerRowIndex === null || !activePreview) return [];
        return (activePreview.rows[headerRowIndex] || []).map((v) =>
            String(v ?? "").trim(),
        );
    }, [activePreview, headerRowIndex]);

    // Determine which column is currently being mapped
    const [activeField, setActiveField] = useState<string | null>(null);

    const handleSheetSelect = useCallback((name: string) => {
        setSelectedSheet(name);
        setHeaderRowIndex(null);
        setColumnMapping({});
        setStep("select_header");
    }, []);

    const handleHeaderSelect = useCallback((rowIdx: number) => {
        setHeaderRowIndex(rowIdx);
        setColumnMapping({});
        setStep("map_columns");
    }, []);

    const handleColumnClick = useCallback(
        (colIdx: number) => {
            if (!activeField) return;
            const letter = colIndexToLetter(colIdx);
            setColumnMapping((prev) => ({ ...prev, [activeField]: letter }));

            // Auto-advance to next unmapped field
            const currentIdx = MAPPABLE_FIELDS.findIndex((f) => f.key === activeField);
            const nextUnmapped = MAPPABLE_FIELDS.slice(currentIdx + 1).find(
                (f) => !columnMapping[f.key] && f.key !== activeField,
            );
            setActiveField(nextUnmapped?.key ?? null);
        },
        [activeField, columnMapping],
    );

    const handleSave = useCallback(async () => {
        if (headerRowIndex === null) return;
        setSaving(true);
        setError(null);

        try {
            const profileData = {
                name: profileName,
                fingerprint,
                targetSheet: selectedSheet || null,
                headerRowIndex,
                dataStartRowIndex: headerRowIndex + 1,
                columnMapping,
                dataEndStrategy,
            };

            const formData = new FormData();
            formData.append("file", file);
            formData.append("profile", JSON.stringify(profileData));

            const res = await fetch("/api/import/profile", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(data.error || `HTTP ${res.status}`);
            }

            const result = await res.json();
            onComplete(result);
        } catch (err: any) {
            setError(err.message || String(err));
        } finally {
            setSaving(false);
        }
    }, [
        headerRowIndex,
        profileName,
        fingerprint,
        selectedSheet,
        columnMapping,
        dataEndStrategy,
        file,
        onComplete,
    ]);

    const hasRequiredMappings = MAPPABLE_FIELDS.filter((f) => f.required).every(
        (f) => columnMapping[f.key],
    );

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="flex flex-col h-full w-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8] shrink-0">
                <div>
                    <h2 className="text-base font-semibold text-[#1C1C1C] flex items-center gap-2">
                        <Table2 className="w-5 h-5 text-[#0A52EF]" />
                        Excel Mapping Wizard
                    </h2>
                    <p className="text-xs text-[#878787] mt-0.5">
                        We don&apos;t recognize this format. Help us read <span className="font-medium text-[#616161]">{fileName}</span>
                    </p>
                </div>
                <button
                    onClick={onCancel}
                    className="p-2 rounded hover:bg-[#F7F7F7] text-[#878787] hover:text-[#1C1C1C] transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1 px-5 py-3 border-b border-[#F0F0F0] text-[10px] uppercase tracking-wider font-medium shrink-0">
                {[
                    { id: "select_sheet", label: "Sheet" },
                    { id: "select_header", label: "Headers" },
                    { id: "map_columns", label: "Columns" },
                    { id: "confirm", label: "Save" },
                ].map((s, i) => (
                    <React.Fragment key={s.id}>
                        {i > 0 && <ArrowRight className="w-3 h-3 text-[#D0D0D0]" />}
                        <span
                            className={cn(
                                "px-2 py-1 rounded",
                                step === s.id
                                    ? "bg-[#0A52EF]/10 text-[#0A52EF]"
                                    : "text-[#878787]",
                            )}
                        >
                            {s.label}
                        </span>
                    </React.Fragment>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-auto">
                {/* Step 1: Select Sheet */}
                {step === "select_sheet" && (
                    <div className="p-5 space-y-3">
                        <p className="text-sm text-[#616161]">
                            This workbook has {rawPreview.length} sheets. Which one contains the data?
                        </p>
                        <div className="space-y-2">
                            {rawPreview.map((preview) => (
                                <button
                                    key={preview.sheetName}
                                    onClick={() => handleSheetSelect(preview.sheetName)}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded border transition-colors",
                                        selectedSheet === preview.sheetName
                                            ? "border-[#0A52EF] bg-[#0A52EF]/5"
                                            : "border-[#E8E8E8] hover:bg-[#F7F7F7]",
                                    )}
                                >
                                    <span className="text-sm font-medium text-[#1C1C1C]">
                                        {preview.sheetName}
                                    </span>
                                    <span className="text-xs text-[#878787] ml-2">
                                        ({preview.totalRows} rows)
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Header Row */}
                {step === "select_header" && activePreview && (
                    <div className="p-5 space-y-3">
                        <div className="flex items-center gap-2 text-sm text-[#616161]">
                            <MousePointerClick className="w-4 h-4 text-[#0A52EF]" />
                            Click the row that contains the column headers (e.g. Description, Price, Qty)
                        </div>
                        <div className="border border-[#E8E8E8] rounded overflow-auto max-h-[60vh]">
                            <table className="w-full text-xs border-collapse">
                                <tbody>
                                    {activePreview.rows.slice(0, 30).map((row, rIdx) => (
                                        <tr
                                            key={rIdx}
                                            onClick={() => handleHeaderSelect(rIdx)}
                                            className={cn(
                                                "cursor-pointer transition-colors",
                                                headerRowIndex === rIdx
                                                    ? "bg-[#0A52EF]/10"
                                                    : "hover:bg-[#F7F7F7]",
                                            )}
                                        >
                                            <td className="px-2 py-1.5 text-[#878787] font-mono border-r border-[#F0F0F0] w-8 text-center select-none">
                                                {rIdx + 1}
                                            </td>
                                            {row.map((cell, cIdx) => (
                                                <td
                                                    key={cIdx}
                                                    className="px-2 py-1.5 border-r border-[#F0F0F0] max-w-[150px] truncate text-[#1C1C1C]"
                                                >
                                                    {cell !== null && cell !== "" ? String(cell) : ""}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Step 3: Map Columns */}
                {step === "map_columns" && activePreview && headerRowIndex !== null && (
                    <div className="flex flex-col h-full">
                        {/* Field selector */}
                        <div className="px-5 py-3 border-b border-[#F0F0F0] shrink-0">
                            <div className="flex items-center gap-2 mb-2 text-sm text-[#616161]">
                                <Columns className="w-4 h-4 text-[#0A52EF]" />
                                Click a field below, then click its column in the grid
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {MAPPABLE_FIELDS.map((field) => {
                                    const mapped = columnMapping[field.key];
                                    return (
                                        <button
                                            key={field.key}
                                            onClick={() => setActiveField(field.key)}
                                            className={cn(
                                                "px-2.5 py-1.5 rounded text-xs font-medium border transition-colors",
                                                activeField === field.key
                                                    ? "border-[#0A52EF] bg-[#0A52EF]/10 text-[#0A52EF]"
                                                    : mapped
                                                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                                        : field.required
                                                            ? "border-amber-300 bg-amber-50 text-amber-700"
                                                            : "border-[#E8E8E8] text-[#616161] hover:bg-[#F7F7F7]",
                                            )}
                                        >
                                            {field.label}
                                            {mapped && (
                                                <span className="ml-1 font-mono text-[10px]">
                                                    ({mapped})
                                                </span>
                                            )}
                                            {field.required && !mapped && (
                                                <span className="ml-1 text-[10px]">*</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Grid with clickable columns */}
                        <div className="flex-1 min-h-0 overflow-auto p-5">
                            <div className="border border-[#E8E8E8] rounded overflow-auto max-h-[50vh]">
                                <table className="w-full text-xs border-collapse">
                                    <thead className="sticky top-0 bg-[#F7F7F7] z-10">
                                        <tr>
                                            <th className="px-2 py-2 text-[#878787] font-mono border-r border-b border-[#E8E8E8] w-8">
                                                #
                                            </th>
                                            {headerCells.map((header, cIdx) => {
                                                const letter = colIndexToLetter(cIdx);
                                                const mappedField = Object.entries(columnMapping).find(
                                                    ([, v]) => v === letter,
                                                );
                                                return (
                                                    <th
                                                        key={cIdx}
                                                        onClick={() => handleColumnClick(cIdx)}
                                                        className={cn(
                                                            "px-2 py-2 text-left border-r border-b border-[#E8E8E8] max-w-[150px] truncate cursor-pointer transition-colors",
                                                            mappedField
                                                                ? "bg-emerald-100 text-emerald-800"
                                                                : activeField
                                                                    ? "hover:bg-[#0A52EF]/10"
                                                                    : "",
                                                        )}
                                                    >
                                                        <div className="font-mono text-[10px] text-[#878787]">
                                                            {letter}
                                                        </div>
                                                        <div className="font-medium text-[#1C1C1C] truncate">
                                                            {header || "—"}
                                                        </div>
                                                        {mappedField && (
                                                            <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                                                → {MAPPABLE_FIELDS.find((f) => f.key === mappedField[0])?.label}
                                                            </div>
                                                        )}
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activePreview.rows
                                            .slice(headerRowIndex + 1, headerRowIndex + 11)
                                            .map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-[#FAFAFA]">
                                                    <td className="px-2 py-1.5 text-[#878787] font-mono border-r border-[#F0F0F0] text-center">
                                                        {headerRowIndex + rIdx + 2}
                                                    </td>
                                                    {row.map((cell, cIdx) => {
                                                        const letter = colIndexToLetter(cIdx);
                                                        const isMapped = Object.values(columnMapping).includes(letter);
                                                        return (
                                                            <td
                                                                key={cIdx}
                                                                onClick={() => handleColumnClick(cIdx)}
                                                                className={cn(
                                                                    "px-2 py-1.5 border-r border-[#F0F0F0] max-w-[150px] truncate",
                                                                    isMapped ? "bg-emerald-50" : "",
                                                                    activeField ? "cursor-pointer" : "",
                                                                )}
                                                            >
                                                                {cell !== null && cell !== "" ? String(cell) : ""}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Data end strategy */}
                            <div className="mt-4 flex items-center gap-3">
                                <label className="text-xs text-[#616161] font-medium">
                                    Data ends at:
                                </label>
                                <select
                                    value={dataEndStrategy}
                                    onChange={(e) => setDataEndStrategy(e.target.value)}
                                    className="text-xs border border-[#E8E8E8] rounded px-2 py-1.5 text-[#1C1C1C] bg-white"
                                >
                                    <option value="blank_row">First blank row</option>
                                    <option value="keyword:grand total">
                                        &quot;Grand Total&quot; text
                                    </option>
                                    <option value="keyword:total">
                                        &quot;Total&quot; text
                                    </option>
                                    <option value="keyword:subtotal">
                                        &quot;Subtotal&quot; text
                                    </option>
                                </select>
                            </div>

                            {/* Advance to confirm */}
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    onClick={() => setStep("confirm")}
                                    disabled={!hasRequiredMappings}
                                    className={cn(
                                        "flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium transition-colors",
                                        hasRequiredMappings
                                            ? "bg-[#0A52EF] text-white hover:bg-[#0A52EF]/90"
                                            : "bg-[#E8E8E8] text-[#878787] cursor-not-allowed",
                                    )}
                                >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Review & Save
                                </button>
                                {!hasRequiredMappings && (
                                    <span className="text-xs text-amber-600">
                                        Map all required fields (marked with *)
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Confirm & Save */}
                {step === "confirm" && (
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="text-xs font-medium text-[#616161] block mb-1">
                                Profile Name
                            </label>
                            <input
                                type="text"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="w-full px-3 py-2 border border-[#E8E8E8] rounded text-sm text-[#1C1C1C] focus:border-[#0A52EF] focus:outline-none"
                                placeholder="e.g. Moody Center Format"
                            />
                            <p className="text-[10px] text-[#878787] mt-1">
                                Next time this layout is uploaded, it will import automatically.
                            </p>
                        </div>

                        <div className="border border-[#E8E8E8] rounded p-3 space-y-2">
                            <h3 className="text-xs font-semibold text-[#1C1C1C] uppercase tracking-wider">
                                Mapping Summary
                            </h3>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                                <span className="text-[#878787]">Sheet:</span>
                                <span className="text-[#1C1C1C] font-medium">{selectedSheet}</span>
                                <span className="text-[#878787]">Header Row:</span>
                                <span className="text-[#1C1C1C] font-medium">{(headerRowIndex ?? 0) + 1}</span>
                                <span className="text-[#878787]">Data Ends:</span>
                                <span className="text-[#1C1C1C] font-medium">{dataEndStrategy.replace("keyword:", "At \"") + (dataEndStrategy.startsWith("keyword:") ? "\"" : "")}</span>
                            </div>
                            <div className="h-px bg-[#F0F0F0] my-2" />
                            <div className="space-y-1">
                                {Object.entries(columnMapping)
                                    .filter(([, v]) => v)
                                    .map(([field, letter]) => (
                                        <div key={field} className="flex items-center gap-2 text-xs">
                                            <Check className="w-3 h-3 text-emerald-500" />
                                            <span className="text-[#616161]">
                                                {MAPPABLE_FIELDS.find((f) => f.key === field)?.label || field}
                                            </span>
                                            <span className="text-[#878787]">→</span>
                                            <span className="font-mono text-[#1C1C1C] font-medium">
                                                Column {letter}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {error && (
                            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving || !profileName.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 rounded text-xs font-medium bg-[#0A52EF] text-white hover:bg-[#0A52EF]/90 transition-colors disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {saving ? "Saving..." : "Import & Remember"}
                            </button>
                            <button
                                onClick={() => setStep("map_columns")}
                                className="px-3 py-2 rounded text-xs text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                            >
                                Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
