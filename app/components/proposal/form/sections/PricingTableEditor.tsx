"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ProposalType } from "@/types";
import { PricingDocument, PricingTable } from "@/types/pricing";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, FileText, ChevronDown, ChevronUp, RotateCcw, EyeOff, Eye } from "lucide-react";
import { formatCurrency } from "@/lib/helpers";

// ─── Debounced Inputs ────────────────────────────────────────────────────────

const DebouncedInput = ({
    value,
    onChange,
    placeholder,
    className
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    className?: string;
}) => {
    const [localValue, setLocalValue] = useState(value || "");

    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    return (
        <input
            type="text"
            placeholder={placeholder}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
        />
    );
};

const DebouncedNumberInput = ({
    value,
    onChange,
    placeholder,
    className
}: {
    value: number;
    onChange: (val: number) => void;
    placeholder: string;
    className?: string;
}) => {
    const [localValue, setLocalValue] = useState(String(value));

    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    const handleBlur = () => {
        const parsed = parseFloat(localValue.replace(/[,$\s]/g, ""));
        if (!isNaN(parsed) && parsed !== value) {
            onChange(parsed);
        } else if (localValue.trim() === "" || isNaN(parsed)) {
            // Reset to original if invalid
            setLocalValue(String(value));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            (e.currentTarget as HTMLInputElement).blur();
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            placeholder={placeholder}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={className}
        />
    );
};

const DebouncedTextarea = ({
    value,
    onChange,
    placeholder,
    className
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder: string;
    className?: string;
}) => {
    const [localValue, setLocalValue] = useState(value || "");

    useEffect(() => {
        setLocalValue(value || "");
    }, [value]);

    const handleBlur = () => {
        if (localValue !== value) {
            onChange(localValue);
        }
    };

    return (
        <Textarea
            placeholder={placeholder}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            className={className}
        />
    );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getEffectivePrice(
    priceOverrides: Record<string, number>,
    tableId: string,
    idx: number,
    originalPrice: number
): number {
    const key = `${tableId}:${idx}`;
    return priceOverrides[key] !== undefined ? priceOverrides[key] : originalPrice;
}

function computeEffectiveSubtotal(
    table: PricingTable,
    priceOverrides: Record<string, number>
): number {
    return (table.items || []).reduce((sum, item, idx) => {
        if (item.isIncluded) return sum;
        return sum + getEffectivePrice(priceOverrides, table.id, idx, item.sellingPrice);
    }, 0);
}

function computeEffectiveTax(
    table: PricingTable,
    effectiveSubtotal: number
): number {
    if (!table.tax) return 0;
    // Derive rate from original data
    const originalRate = table.subtotal > 0
        ? table.tax.amount / table.subtotal
        : 0;
    return effectiveSubtotal * originalRate;
}

function computeEffectiveGrandTotal(
    table: PricingTable,
    priceOverrides: Record<string, number>
): number {
    const sub = computeEffectiveSubtotal(table, priceOverrides);
    const tax = computeEffectiveTax(table, sub);
    return sub + tax + (table.bond || 0);
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PricingTableEditor() {
    const { setValue, getValues, control } = useFormContext<ProposalType>();

    const pricingDocument: PricingDocument | null = useWatch({
        control,
        name: "details.pricingDocument" as any,
    });

    const tableHeaderOverrides: Record<string, string> = useWatch({
        control,
        name: "details.tableHeaderOverrides" as any,
    }) || {};

    const descriptionOverrides: Record<string, string> = useWatch({
        control,
        name: "details.descriptionOverrides" as any,
    }) || {};

    const priceOverrides: Record<string, number> = useWatch({
        control,
        name: "details.priceOverrides" as any,
    }) || {};

    const customProposalNotes: string = useWatch({
        control,
        name: "details.customProposalNotes" as any,
    }) || "";

    const documentMode = useWatch({
        control,
        name: "details.documentMode",
    }) || "BUDGET";

    // Don't render if no pricing document
    if (!pricingDocument || !pricingDocument.tables || pricingDocument.tables.length === 0) {
        return null;
    }

    const tables = pricingDocument.tables;

    // Count overrides for badge
    const overrideCount = Object.keys(tableHeaderOverrides).filter(k => tableHeaderOverrides[k]).length
        + Object.keys(descriptionOverrides).length
        + Object.keys(priceOverrides).length;

    // ── Handlers ──

    const handleHeaderChange = (tableId: string, newName: string) => {
        const updated = { ...tableHeaderOverrides, [tableId]: newName };
        setValue("details.tableHeaderOverrides" as any, updated, { shouldDirty: true });
    };

    const handleDescriptionChange = (tableId: string, itemIndex: number, newDesc: string) => {
        const key = `${tableId}:${itemIndex}`;
        const updated = { ...descriptionOverrides, [key]: newDesc };
        setValue("details.descriptionOverrides" as any, updated, { shouldDirty: true });
    };

    const handleDescriptionReset = (tableId: string, itemIndex: number) => {
        const key = `${tableId}:${itemIndex}`;
        const updated = { ...descriptionOverrides };
        delete updated[key];
        setValue("details.descriptionOverrides" as any, updated, { shouldDirty: true });
    };

    const handlePriceChange = (tableId: string, itemIndex: number, newPrice: number) => {
        const key = `${tableId}:${itemIndex}`;
        const updated = { ...priceOverrides, [key]: newPrice };
        setValue("details.priceOverrides" as any, updated, { shouldDirty: true });
    };

    const handlePriceReset = (tableId: string, itemIndex: number) => {
        const key = `${tableId}:${itemIndex}`;
        const updated = { ...priceOverrides };
        delete updated[key];
        setValue("details.priceOverrides" as any, updated, { shouldDirty: true });
    };

    const handleNotesChange = (notes: string) => {
        setValue("details.customProposalNotes" as any, notes, { shouldDirty: true });
    };

    const handleToggleItemInclusion = (tableId: string, itemIndex: number) => {
        const current = getValues("details.pricingDocument" as any) as PricingDocument | null;
        if (!current?.tables?.length) return;

        const nextTables = (current.tables || []).map((table) => {
            if (table.id !== tableId) return table;
            const nextItems = (table.items || []).map((item, idx) => {
                if (idx !== itemIndex) return item;
                return {
                    ...item,
                    isIncluded: !item.isIncluded,
                };
            });
            return {
                ...table,
                items: nextItems,
            };
        });

        setValue(
            "details.pricingDocument" as any,
            {
                ...current,
                tables: nextTables,
            },
            { shouldDirty: true }
        );
    };

    const handleResetAll = () => {
        setValue("details.tableHeaderOverrides" as any, {}, { shouldDirty: true });
        setValue("details.descriptionOverrides" as any, {}, { shouldDirty: true });
        setValue("details.priceOverrides" as any, {}, { shouldDirty: true });
    };

    // ── Effective document total ──
    const effectiveDocumentTotal = tables.reduce(
        (sum, t) => sum + computeEffectiveGrandTotal(t, priceOverrides),
        0
    );
    const originalDocumentTotal = pricingDocument.documentTotal
        ?? tables.reduce((sum, t) => sum + t.grandTotal, 0);
    const totalChanged = Math.abs(effectiveDocumentTotal - originalDocumentTotal) >= 0.01;

    return (
        <div className="flex flex-col gap-3 w-full">
            {/* ── Header Card ── */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0A52EF] rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-md">
                        <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">Pricing Line Items</h3>
                        <p className="text-[11px] text-white/70">
                            {tables.length} section{tables.length !== 1 ? "s" : ""} &middot; Click to edit descriptions and amounts
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {overrideCount > 0 && (
                        <span className="text-[10px] bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                            {overrideCount} edit{overrideCount !== 1 ? "s" : ""}
                        </span>
                    )}
                    {overrideCount > 0 && (
                        <button
                            type="button"
                            onClick={handleResetAll}
                            className="flex items-center gap-1 text-[10px] text-white/80 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition-colors"
                        >
                            <RotateCcw className="w-3 h-3" />
                            Reset All
                        </button>
                    )}
                    {/* Grand Total intentionally hidden — Natalia request */}
                </div>
            </div>

            {/* ── Pricing Sections ── */}
            {tables.map((table) => (
                <PricingSection
                    key={table.id}
                    table={table}
                    tableHeaderOverrides={tableHeaderOverrides}
                    descriptionOverrides={descriptionOverrides}
                    priceOverrides={priceOverrides}
                    onHeaderChange={handleHeaderChange}
                    onDescriptionChange={handleDescriptionChange}
                    onDescriptionReset={handleDescriptionReset}
                    onPriceChange={handlePriceChange}
                    onPriceReset={handlePriceReset}
                    onToggleItemInclusion={handleToggleItemInclusion}
                />
            ))}

            {/* ── Custom Proposal Notes ── */}
            <div className="px-4 py-3 rounded-lg border border-border bg-card/50 space-y-2">
                <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Custom Proposal Notes</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                    {documentMode === "LOI"
                        ? "Appears in the 'Additional Notes' section of the LOI."
                        : "Appears after the pricing breakdown in the PDF."}
                </p>
                <DebouncedTextarea
                    placeholder="Enter any additional notes, terms, or clarifications..."
                    value={customProposalNotes}
                    onChange={handleNotesChange}
                    className="min-h-[80px] text-sm bg-background border-border resize-y"
                />
            </div>

            {/* ── Currency Info ── */}
            {pricingDocument.currency && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md text-[10px]">
                    <span className="text-muted-foreground uppercase tracking-wider">Currency:</span>
                    <span className="font-semibold text-foreground">{pricingDocument.currency}</span>
                    <span className="text-muted-foreground ml-auto">from &quot;{pricingDocument.sourceSheet}&quot;</span>
                </div>
            )}
        </div>
    );
}

// ─── Individual Pricing Section ──────────────────────────────────────────────

function PricingSection({
    table,
    tableHeaderOverrides,
    descriptionOverrides,
    priceOverrides,
    onHeaderChange,
    onDescriptionChange,
    onDescriptionReset,
    onPriceChange,
    onPriceReset,
    onToggleItemInclusion,
}: {
    table: PricingTable;
    tableHeaderOverrides: Record<string, string>;
    descriptionOverrides: Record<string, string>;
    priceOverrides: Record<string, number>;
    onHeaderChange: (tableId: string, name: string) => void;
    onDescriptionChange: (tableId: string, idx: number, desc: string) => void;
    onDescriptionReset: (tableId: string, idx: number) => void;
    onPriceChange: (tableId: string, idx: number, price: number) => void;
    onPriceReset: (tableId: string, idx: number) => void;
    onToggleItemInclusion: (tableId: string, idx: number) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const items = table.items || [];
    const headerOverride = tableHeaderOverrides[table.id] || "";
    const displayName = headerOverride || table.name;

    // Computed totals
    const effectiveSubtotal = computeEffectiveSubtotal(table, priceOverrides);
    const effectiveTax = computeEffectiveTax(table, effectiveSubtotal);
    const effectiveGrandTotal = effectiveSubtotal + effectiveTax + (table.bond || 0);
    const hasAnyOverride = items.some((_, idx) => {
        const key = `${table.id}:${idx}`;
        return descriptionOverrides[key] !== undefined || priceOverrides[key] !== undefined;
    }) || !!headerOverride;

    return (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Section Header */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-sm font-semibold text-foreground truncate">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                    {hasAnyOverride && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                            edited
                        </span>
                    )}
                </div>
                <span className="text-sm font-bold text-foreground shrink-0 ml-3">
                    {formatCurrency(effectiveGrandTotal)}
                </span>
            </button>

            {isExpanded && (
                <div className="px-4 py-3 space-y-3 animate-in fade-in duration-150">
                    {/* Editable Section Header */}
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider shrink-0 w-20">Header:</span>
                        <DebouncedInput
                            placeholder={table.name}
                            value={headerOverride || table.name}
                            onChange={(val) => onHeaderChange(table.id, val === table.name ? "" : val)}
                            className="flex-1 min-w-0 px-2 py-1.5 text-xs bg-background border border-border rounded-md focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/20 transition-colors"
                        />
                        {headerOverride && (
                            <button
                                type="button"
                                onClick={() => onHeaderChange(table.id, "")}
                                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-1 rounded hover:bg-muted transition-colors shrink-0"
                            >
                                <RotateCcw className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    {/* Column Headers */}
                    <div className="grid grid-cols-[1fr_120px_56px] gap-2 px-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider text-right">Amount</span>
                        <span />
                    </div>

                    {/* Line Items */}
                    <div className="space-y-1">
                        {items.map((item: any, idx: number) => {
                            const key = `${table.id}:${idx}`;
                            const originalDesc = (item?.description || "Item").toString();
                            const descOverride = descriptionOverrides[key];
                            const isDescOverridden = descOverride !== undefined && descOverride !== "";

                            const originalPrice = Number(item?.sellingPrice ?? 0);
                            const priceOverride = priceOverrides[key];
                            const isPriceOverridden = priceOverride !== undefined;
                            const effectivePrice = isPriceOverridden ? priceOverride : originalPrice;

                            const isIncluded = item?.isIncluded === true;
                            const anyOverride = isDescOverridden || isPriceOverridden;

                            return (
                                <div
                                    key={key}
                                    className={`grid grid-cols-[1fr_120px_56px] gap-2 items-center rounded-md px-1 py-0.5 ${
                                        anyOverride ? "bg-amber-500/5" : ""
                                    }`}
                                >
                                    {/* Description */}
                                    <DebouncedInput
                                        placeholder={originalDesc}
                                        value={isDescOverridden ? descOverride : originalDesc}
                                        onChange={(val) => onDescriptionChange(table.id, idx, val)}
                                        className={`w-full px-2 py-1.5 text-xs bg-background border rounded-md transition-colors ${
                                            isDescOverridden
                                                ? "border-amber-500/40"
                                                : "border-border"
                                        } focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/20`}
                                    />
                                    {/* Amount */}
                                    {isIncluded ? (
                                        <div className="text-xs text-right font-medium text-muted-foreground pr-2 py-1.5">
                                            INCLUDED
                                        </div>
                                    ) : (
                                        <DebouncedNumberInput
                                            value={effectivePrice}
                                            onChange={(val) => onPriceChange(table.id, idx, val)}
                                            placeholder={formatCurrency(originalPrice) || "0.00"}
                                            className={`w-full px-2 py-1.5 text-xs text-right font-medium bg-background border rounded-md transition-colors ${
                                                isPriceOverridden
                                                    ? "border-amber-500/40"
                                                    : "border-border"
                                            } focus:border-[#0A52EF] focus:ring-1 focus:ring-[#0A52EF]/20`}
                                        />
                                    )}
                                    {/* Reset */}
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onToggleItemInclusion(table.id, idx)}
                                            className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
                                                isIncluded
                                                    ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            }`}
                                            title={isIncluded ? "Include in totals" : "Exclude from totals"}
                                        >
                                            {isIncluded ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        </button>
                                        {anyOverride ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (isDescOverridden) onDescriptionReset(table.id, idx);
                                                    if (isPriceOverridden) onPriceReset(table.id, idx);
                                                }}
                                                className="flex items-center justify-center w-7 h-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded transition-colors"
                                                title="Reset to Excel original"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                            </button>
                                        ) : (
                                            <div className="w-7" />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Totals Footer */}
                    <div className="border-t border-border pt-2 mt-2 space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                            <span>Subtotal</span>
                            <span className={`font-medium ${Math.abs(effectiveSubtotal - table.subtotal) >= 0.01 ? "text-amber-600" : ""}`}>
                                {formatCurrency(effectiveSubtotal)}
                            </span>
                        </div>
                        {table.tax && (
                            <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <span>{table.tax.label}</span>
                                <span className={`font-medium ${Math.abs(effectiveTax - table.tax.amount) >= 0.01 ? "text-amber-600" : ""}`}>
                                    {formatCurrency(effectiveTax)}
                                </span>
                            </div>
                        )}
                        {(table.bond || 0) > 0 && (
                            <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <span>Bond</span>
                                <span className="font-medium">{formatCurrency(table.bond)}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-sm font-bold text-foreground px-1 pt-1 border-t border-border">
                            <span>Total</span>
                            <span className={Math.abs(effectiveGrandTotal - table.grandTotal) >= 0.01 ? "text-amber-600" : ""}>
                                {formatCurrency(effectiveGrandTotal)}
                            </span>
                        </div>
                    </div>

                    {/* Alternates (read-only display) */}
                    {table.alternates && table.alternates.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed border-border">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Alternates</span>
                            <div className="space-y-1 mt-1">
                                {table.alternates.map((alt: any, idx: number) => (
                                    <div key={idx} className="flex justify-between text-xs text-muted-foreground px-1">
                                        <span className="italic truncate flex-1 mr-2">{alt.description}</span>
                                        <span className="font-medium shrink-0">
                                            {alt.priceDifference === 0
                                                ? "No Change"
                                                : alt.priceDifference < 0
                                                    ? `(${formatCurrency(Math.abs(alt.priceDifference))})`
                                                    : formatCurrency(alt.priceDifference)
                                            }
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
