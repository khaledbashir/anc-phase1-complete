"use client";

import React, { useCallback, useState } from "react";
import { UploadCloud, File as FileIcon, Loader2, AlertCircle } from "lucide-react";

interface UploadZoneProps {
    onUpload: (file: File) => void;
    isLoading: boolean;
}

export default function UploadZone({ onUpload, isLoading }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isLoading) setIsDragging(true);
    }, [isLoading]);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const validateAndUpload = (file: File) => {
        setError(null);
        if (file.type !== "application/pdf") {
            setError("Only PDF files are supported.");
            return;
        }
        if (file.size > 2000 * 1024 * 1024) {
            setError("File is too large. Maximum size is 2GB.");
            return;
        }
        onUpload(file);
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isLoading) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            validateAndUpload(files[0]);
        }
    }, [isLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndUpload(e.target.files[0]);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-12">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${isLoading
                    ? "border-muted bg-muted/20 cursor-not-allowed opacity-70"
                    : isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
            >
                <input
                    type="file"
                    accept="application/pdf"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleFileChange}
                    disabled={isLoading}
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center text-primary">
                            <Loader2 className="w-12 h-12 mb-4 animate-spin" />
                            <h3 className="text-xl font-semibold">Triage in Progress</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                                Analyzing your PDF... This may take up to 30 seconds for massive documents. Please wait.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                                <UploadCloud className="w-8 h-8 text-primary" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-foreground">Upload RFP PDF</h3>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Drag and drop your document here, or click to browse.
                                </p>
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full flex items-center gap-2">
                                <FileIcon className="w-3 h-3" />
                                Up to 2GB (PDF only)
                            </div>
                        </>
                    )}
                </div>
            </div>

            {error && (
                <div className="mt-4 p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-sm">{error}</div>
                </div>
            )}
        </div>
    );
}
