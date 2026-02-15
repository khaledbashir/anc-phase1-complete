"use client";

/**
 * BundlePanel — Shows auto-suggested accessories per display.
 *
 * Users can toggle individual items on/off. Excluded items are stored
 * in DisplayAnswers.excludedBundleItems and persist across renders.
 */

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    X,
    Package,
    Cpu,
    Wrench,
    Zap,
    Box,
    HardHat,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import type { BundleItem } from "@/services/estimator/bundleRules";
import { CATEGORY_LABELS } from "@/services/estimator/bundleRules";
import type { ScreenCalc } from "./EstimatorBridge";
import type { DisplayAnswers } from "./questions";

interface BundlePanelProps {
    calcs: ScreenCalc[];
    displays: DisplayAnswers[];
    onToggleItem: (displayIndex: number, itemId: string) => void;
    onClose: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    signal: Cpu,
    structural: Wrench,
    electrical: Zap,
    accessory: Box,
    service: HardHat,
};

export default function BundlePanel({ calcs, displays, onToggleItem, onClose }: BundlePanelProps) {
    const [expandedDisplay, setExpandedDisplay] = React.useState<number>(0);

    const projectTotal = calcs.reduce((sum, c) => sum + c.bundleCost, 0);
    const totalItems = calcs.reduce((sum, c) => sum + c.bundleItems.length, 0);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Header */}
            <div className="shrink-0 px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-semibold">Smart Assembly Bundle</span>
                    <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-medium">
                        {totalItems} items
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-orange-600">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(projectTotal)}
                    </span>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
                {calcs.length === 0 && (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                        Add a display to see suggested accessories.
                    </div>
                )}

                {calcs.map((calc, di) => {
                    const display = displays[di];
                    if (!display || calc.bundleItems.length === 0) return null;
                    const isExpanded = expandedDisplay === di;
                    const excludedIds = display.excludedBundleItems || [];
                    const activeCount = calc.bundleItems.filter((b) => !excludedIds.includes(b.id)).length;

                    return (
                        <div key={di} className="border-b border-border last:border-b-0">
                            {/* Display header */}
                            <button
                                onClick={() => setExpandedDisplay(isExpanded ? -1 : di)}
                                className="w-full flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    {isExpanded ? (
                                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                                    )}
                                    <span className="text-sm font-medium">{calc.name}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {activeCount}/{calc.bundleItems.length} active
                                    </span>
                                </div>
                                <span className="text-xs font-semibold">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(calc.bundleCost)}
                                </span>
                            </button>

                            {/* Item list */}
                            {isExpanded && (
                                <div className="px-5 pb-4 space-y-1">
                                    {calc.bundleItems.map((item) => (
                                        <BundleItemRow
                                            key={item.id}
                                            item={item}
                                            excluded={excludedIds.includes(item.id)}
                                            onToggle={() => onToggleItem(di, item.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-3 border-t border-border bg-orange-50 dark:bg-orange-950/20">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                        Toggle items on/off — costs auto-update in all sheets
                    </span>
                    <span className="text-sm font-bold text-orange-600">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(projectTotal)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// BUNDLE ITEM ROW
// ============================================================================

function BundleItemRow({
    item,
    excluded,
    onToggle,
}: {
    item: BundleItem;
    excluded: boolean;
    onToggle: () => void;
}) {
    const Icon = CATEGORY_ICONS[item.category] || Box;
    const fmt = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

    return (
        <div
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer group",
                excluded
                    ? "opacity-40 hover:opacity-60"
                    : "hover:bg-accent/20"
            )}
            onClick={onToggle}
        >
            {/* Toggle checkbox */}
            <div className={cn(
                "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                excluded
                    ? "border-border bg-background"
                    : "border-orange-500 bg-orange-500"
            )}>
                {!excluded && (
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>

            {/* Icon + name */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className={cn("text-xs font-medium truncate", excluded && "line-through")}>
                        {item.name}
                    </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {item.reason}
                </p>
            </div>

            {/* Qty + cost */}
            <div className="text-right shrink-0">
                <span className="text-xs font-semibold">
                    {excluded ? "—" : fmt.format(item.totalCost)}
                </span>
                {item.quantity > 1 && !excluded && (
                    <p className="text-[10px] text-muted-foreground">
                        {item.quantity} × {fmt.format(item.unitCost)}
                    </p>
                )}
            </div>
        </div>
    );
}
