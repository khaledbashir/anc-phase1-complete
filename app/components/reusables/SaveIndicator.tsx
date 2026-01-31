"use client";

import { useState, useEffect } from "react";
import { Check, Cloud, CloudOff, Loader2 } from "lucide-react";
import type { AutoSaveStatus } from "@/lib/useAutoSave";

type SaveStatus = AutoSaveStatus;

interface SaveIndicatorProps {
    status: SaveStatus;
    lastSavedAt?: Date;
    className?: string;
}

/**
 * SaveIndicator - Google Docs-style save status indicator
 * 
 * Shows the current auto-save status in the navbar:
 * - idle: Cloud icon (neutral)
 * - saving: "Saving..." with spinner
 * - saved: "Saved to Vault ✓" with checkmark
 * - error: "Sync failed" with error icon
 */
export function SaveIndicator({ status, lastSavedAt, className = "" }: SaveIndicatorProps) {
    const [displayStatus, setDisplayStatus] = useState<SaveStatus>(status);

    // Sync external status changes
    useEffect(() => {
        setDisplayStatus(status);
    }, [status]);

    return (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${className}`}>
            {displayStatus === "idle" && (
                <span className="flex items-center gap-1 text-zinc-400">
                    <Cloud className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Vault</span>
                </span>
            )}

            {displayStatus === "saving" && (
                <span className="flex items-center gap-1.5 text-[#0A52EF]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                </span>
            )}

            {displayStatus === "saved" && (
                <span className="flex items-center gap-1.5 text-emerald-500">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Vault ✓</span>
                </span>
            )}

            {displayStatus === "error" && (
                <span className="flex items-center gap-1.5 text-red-500">
                    <CloudOff className="w-3.5 h-3.5" />
                    <span>Sync failed</span>
                </span>
            )}
        </div>
    );
}

export default SaveIndicator;
