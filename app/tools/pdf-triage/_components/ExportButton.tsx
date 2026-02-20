"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { extractPages } from "../_lib/triageApi";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
    file: File | null;
    selectedPages: Set<number>;
    disabled?: boolean;
}

export default function ExportButton({ file, selectedPages, disabled }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        if (!file || selectedPages.size === 0) return;

        setIsExporting(true);
        setError(null);

        try {
            // Convert Set to sorted Array
            const pageNums = Array.from(selectedPages).sort((a, b) => a - b);

            // Call extraction API
            const blob = await extractPages(file, pageNums);

            // Create download trigger
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Construct filename
            const extStart = file.name.lastIndexOf('.');
            const baseName = extStart > -1 ? file.name.substring(0, extStart) : file.name;
            a.download = `${baseName}_filtered.pdf`;

            document.body.appendChild(a);
            a.click();

            // Cleanup
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error("Export error:", err);
            setError(err.message || "Failed to extract PDF");
        } finally {
            setIsExporting(false);
        }
    };

    const isDisabled = disabled || isExporting || selectedPages.size === 0 || !file;

    return (
        <div className="fixed bottom-0 left-0 right-0 md:left-20 border-t border-border bg-background/80 backdrop-blur-md p-4 flex items-center justify-between z-40 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                    {selectedPages.size} pages selected for export
                </span>
                {error && <span className="text-xs text-destructive mt-0.5">{error}</span>}
            </div>

            <button
                onClick={handleExport}
                disabled={isDisabled}
                className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all",
                    isDisabled
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg hover:-translate-y-0.5"
                )}
            >
                {isExporting ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Extracting...
                    </>
                ) : (
                    <>
                        <Download className="w-4 h-4" />
                        Export PDF
                    </>
                )}
            </button>
        </div>
    );
}
