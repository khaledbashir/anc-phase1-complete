"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type FilterTab = "All" | "Keep" | "Maybe" | "Discard" | "Drawings";

interface FilterControlsProps {
    activeTab: FilterTab;
    onTabChange: (tab: FilterTab) => void;
    availableCategories: string[];
    disabledCategories: Set<string>;
    onToggleCategory: (category: string) => void;
}

const HUMAN_CATEGORY_LABELS: Record<string, string> = {
    display_hardware: "Display Hardware",
    specs: "Specs",
    electrical: "Electrical",
    structural: "Structural",
    installation: "Installation",
    control_data: "Control Data",
    permits_logistics: "Permits & Logistics",
    commercial: "Commercial",
    manufacturers: "Manufacturers",
};

export default function FilterControls({
    activeTab,
    onTabChange,
    availableCategories,
    disabledCategories,
    onToggleCategory
}: FilterControlsProps) {
    const tabs: FilterTab[] = ["All", "Keep", "Maybe", "Discard", "Drawings"];

    return (
        <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-4">
            {/* View Tabs */}
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-lg self-start">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => onTabChange(tab)}
                            className={cn(
                                "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                                activeTab === tab
                                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Chips */}
            {availableCategories.length > 0 && (
                <div className="pt-3 border-t border-border">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                        Filter by Keyword Category (Dims non-matching)
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {availableCategories.map(cat => {
                            const isOff = disabledCategories.has(cat);
                            return (
                                <button
                                    key={cat}
                                    onClick={() => onToggleCategory(cat)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-full border transition-all",
                                        isOff
                                            ? "border-border bg-transparent text-muted-foreground opacity-60 hover:opacity-100"
                                            : "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                                    )}
                                >
                                    <span className="flex items-center gap-1.5">
                                        <div className={cn("w-2 h-2 rounded-full", isOff ? "bg-muted-foreground" : "bg-primary")} />
                                        {HUMAN_CATEGORY_LABELS[cat] || cat}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
