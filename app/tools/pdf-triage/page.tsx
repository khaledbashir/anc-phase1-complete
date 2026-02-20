"use client";

import React, { useState, useEffect } from "react";
import UploadZone from "./_components/UploadZone";
import SummaryCards from "./_components/SummaryCards";
import FilterControls, { FilterTab } from "./_components/FilterControls";
import TriageTable from "./_components/TriageTable";
import ExportButton from "./_components/ExportButton";
import { triagePdf, TriageResponse, TriagePage } from "./_lib/triageApi";
import { Loader2, RefreshCcw } from "lucide-react";

export default function PdfTriagePage() {
    // Triage State
    const [file, setFile] = useState<File | null>(null);
    const [isTriaging, setIsTriaging] = useState(false);
    const [triageData, setTriageData] = useState<TriageResponse | null>(null);
    const [triageError, setTriageError] = useState<string | null>(null);

    // Filter & Selection State
    const [activeTab, setActiveTab] = useState<FilterTab>("All");
    const [disabledCategories, setDisabledCategories] = useState<Set<string>>(new Set());
    const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());

    // Extract categories available in this document for the filters
    const availableCategories = React.useMemo(() => {
        if (!triageData?.pages) return [];
        const cats = new Set<string>();
        triageData.pages.forEach(p => {
            p.matched_categories.forEach(c => cats.add(c));
        });
        return Array.from(cats).sort();
    }, [triageData]);

    // Handle Upload & Triage
    const handleUpload = async (uploadedFile: File) => {
        setFile(uploadedFile);
        setIsTriaging(true);
        setTriageError(null);
        setTriageData(null);
        setSelectedPages(new Set());
        setDisabledCategories(new Set());
        setActiveTab("All");

        try {
            const data = await triagePdf(uploadedFile);
            setTriageData(data);

            // Auto-select pages marked as 'keep' by default
            const initialSelection = new Set<number>();
            data.pages.forEach(p => {
                if (p.recommended === "keep") {
                    initialSelection.add(p.page_num);
                }
            });
            setSelectedPages(initialSelection);

        } catch (err: any) {
            console.error("Triage error:", err);
            setTriageError(err.message || "An unknown error occurred during PDF processing.");
        } finally {
            setIsTriaging(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setTriageData(null);
        setTriageError(null);
        setSelectedPages(new Set());
        setDisabledCategories(new Set());
        setActiveTab("All");
    };

    const toggleCategory = (category: string) => {
        setDisabledCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) newSet.delete(category);
            else newSet.add(category);
            return newSet;
        });
    };

    const toggleSelection = (pageNums: number[]) => {
        setSelectedPages(prev => {
            const newSet = new Set(prev);
            // Determine if we should add or remove. 
            // If all of the provided pages are already selected, we unselect them. 
            // Otherwise, we select all of them.
            const allSelected = pageNums.every(n => newSet.has(n));

            if (allSelected) {
                pageNums.forEach(n => newSet.delete(n));
            } else {
                pageNums.forEach(n => newSet.add(n));
            }
            return newSet;
        });
    };

    const handleStatusChange = (pageNum: number, newStatus: TriagePage["recommended"]) => {
        setTriageData(prev => {
            if (!prev) return prev;
            const updatedPages = prev.pages.map(p => {
                if (p.page_num === pageNum) {
                    return { ...p, recommended: newStatus };
                }
                return p;
            });
            return { ...prev, pages: updatedPages };
        });
    };

    return (
        <div className="flex-1 min-w-0 bg-background relative min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border py-4 px-6 xl:px-8">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">RFP Triage</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Analyze massive RFP PDFs to isolate highly relevant spec sheets and drawings.
                        </p>
                    </div>
                    {triageData && (
                        <button
                            onClick={handleReset}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                        >
                            <RefreshCcw className="w-4 h-4" />
                            Upload Another
                        </button>
                    )}
                </div>
            </header>

            <main className="p-6 xl:px-8 max-w-7xl mx-auto">
                {/* Upload State */}
                {!triageData && (
                    <UploadZone onUpload={handleUpload} isLoading={isTriaging} />
                )}

                {/* Error State */}
                {triageError && !isTriaging && (
                    <div className="mt-8 p-6 max-w-2xl mx-auto text-center border border-destructive/20 bg-destructive/10 rounded-xl">
                        <h3 className="text-lg font-semibold text-destructive mb-2">Analysis Failed</h3>
                        <p className="text-sm text-destructive/80 mb-4">{triageError}</p>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-background border border-border rounded-lg text-sm font-medium hover:bg-muted"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Results State */}
                {triageData && !isTriaging && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
                        <SummaryCards
                            filename={triageData.filename}
                            totalPages={triageData.total_pages}
                            textPages={triageData.text_pages}
                            drawingPages={triageData.drawing_pages}
                            processingTimeMs={triageData.processing_time_ms}
                            selectedCount={selectedPages.size}
                        />

                        <FilterControls
                            activeTab={activeTab}
                            onTabChange={setActiveTab}
                            availableCategories={availableCategories}
                            disabledCategories={disabledCategories}
                            onToggleCategory={toggleCategory}
                        />

                        <TriageTable
                            pages={triageData.pages}
                            selectedPages={selectedPages}
                            onToggleSelection={toggleSelection}
                            activeTab={activeTab}
                            disabledCategories={disabledCategories}
                            onStatusChange={handleStatusChange}
                        />

                        <ExportButton
                            file={file}
                            selectedPages={selectedPages}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
