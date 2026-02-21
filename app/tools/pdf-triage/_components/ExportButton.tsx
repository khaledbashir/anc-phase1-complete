"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { extractPages } from "../_lib/triageApi";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
    files: File[];
    selectedPages: Set<number>;
    disabled?: boolean;
}

export default function ExportButton({ files, selectedPages, disabled }: ExportButtonProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExport = async () => {
        if (files.length === 0 || selectedPages.size === 0) return;

        setIsExporting(true);
        setError(null);

        try {
            // Convert Set to sorted Array
            const pageNums = Array.from(selectedPages).sort((a, b) => a - b);

            // TODO: The backend /api/extract only supports a single file currently.
            // For now, we will just export pages from the first file.
            const fileToExtract = files[0];
            const blob = await extractPages(fileToExtract, pageNums);

            // Create download trigger
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Construct filename
            const extStart = fileToExtract.name.lastIndexOf('.');
            const baseName = extStart > -1 ? fileToExtract.name.substring(0, extStart) : fileToExtract.name;
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

    const isDisabled = disabled || isExporting || selectedPages.size === 0 || files.length === 0;

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
