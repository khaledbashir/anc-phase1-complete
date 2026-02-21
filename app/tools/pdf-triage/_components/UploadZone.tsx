"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import { UploadCloud, File as FileIcon, Loader2, AlertCircle, Clock, Zap, FileSearch, CheckCircle2 } from "lucide-react";

interface UploadZoneProps {
    onUpload: (files: File[]) => void;
    isLoading: boolean;
    realProgress?: number; // 0-100
}

const STAGES = [
    { label: "Uploading PDFs", icon: UploadCloud, minTime: 0 },
    { label: "Parsing pages", icon: FileSearch, minTime: 3 },
    { label: "Classifying content", icon: Zap, minTime: 8 },
    { label: "Scoring relevance", icon: CheckCircle2, minTime: 15 },
];

export default function UploadZone({ onUpload, isLoading, realProgress }: UploadZoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [fileName, setFileName] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Elapsed time counter
    useEffect(() => {
        if (isLoading) {
            setElapsedSeconds(0);
            intervalRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [isLoading]);

    // Calculate current stage based on elapsed time OR real progress
    const currentStageIndex = STAGES.reduce((acc, stage, i) => {
        if (realProgress !== undefined) {
            // If we have real progress, we stay in "Uploading" until 100%
            return realProgress < 100 ? 0 : Math.max(1, acc);
        }
        return elapsedSeconds >= stage.minTime ? i : acc;
    }, 0);

    // Simulated progress vs Real Progress
    const displayProgress = realProgress !== undefined
        ? realProgress
        : Math.min(95, Math.round((1 - Math.exp(-elapsedSeconds / 25)) * 100));

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

    const validateAndUpload = (files: File[]) => {
        setError(null);

        const validFiles = files.filter(f => f.type === "application/pdf");
        if (validFiles.length === 0) {
            setError("Only PDF files are supported.");
            return;
        }

        const tooLarge = validFiles.some(f => f.size > 2000 * 1024 * 1024);
        if (tooLarge) {
            setError("One or more files exceed the 2GB limit.");
            return;
        }

        if (validFiles.length === 1) {
            setFileName(validFiles[0].name);
        } else {
            setFileName(`${validFiles.length} files selected`);
        }

        onUpload(validFiles);
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (isLoading) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            validateAndUpload(files);
        }
    }, [isLoading]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            validateAndUpload(Array.from(e.target.files));
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    return (
        <div className="w-full max-w-2xl mx-auto mt-12">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${isLoading
                    ? "border-primary/30 bg-primary/5 cursor-not-allowed"
                    : isDragging
                        ? "border-primary bg-primary/5 scale-[1.02]"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
            >
                <input
                    type="file"
                    accept="application/pdf"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    onChange={handleFileChange}
                    disabled={isLoading}
                />
                <div className="flex flex-col items-center justify-center space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center w-full max-w-md">
                            {/* Spinner */}
                            <Loader2 className="w-10 h-10 mb-4 animate-spin text-primary" />

                            {/* File name */}
                            {fileName && (
                                <p className="text-xs text-muted-foreground mb-3 truncate max-w-xs">
                                    {fileName}
                                </p>
                            )}

                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-2.5 mb-4 overflow-hidden">
                                <div
                                    className="bg-primary h-2.5 rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${displayProgress}%` }}
                                />
                            </div>

                            {/* Progress percentage + elapsed time */}
                            <div className="flex items-center justify-between w-full text-xs text-muted-foreground mb-5">
                                <span className="font-medium text-primary">
                                    {displayProgress}%
                                    {realProgress !== undefined && realProgress === 100 && " (Processing...)"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatTime(elapsedSeconds)}
                                </span>
                            </div>

                            {/* Stage indicators */}
                            <div className="flex flex-col gap-2 w-full">
                                {STAGES.map((stage, i) => {
                                    const StageIcon = stage.icon;
                                    const isActive = i === currentStageIndex;
                                    const isDone = i < currentStageIndex;
                                    return (
                                        <div
                                            key={stage.label}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${isActive
                                                ? "bg-primary/10 text-primary font-medium"
                                                : isDone
                                                    ? "text-muted-foreground/60"
                                                    : "text-muted-foreground/30"
                                                }`}
                                        >
                                            {isDone ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                            ) : isActive ? (
                                                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                                            ) : (
                                                <StageIcon className="w-4 h-4 shrink-0" />
                                            )}
                                            <span>{stage.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
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
