"use client";

import { useEffect, useRef, useCallback } from "react";
import { useFormContext } from "react-hook-form";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
    projectId: string | null;
    debounceMs?: number;
    onStatusChange?: (status: AutoSaveStatus) => void;
}

/**
 * useAutoSave - Enterprise Auto-Save Hook
 * 
 * Implements a 2000ms debounced "heartbeat" save to the Project Vault.
 * Designed for large 40+ screen projects without lagging the browser.
 * 
 * @param options.projectId - The project ID to save to (null = disabled)
 * @param options.debounceMs - Debounce delay in ms (default: 2000)
 * @param options.onStatusChange - Callback when save status changes
 */
export function useAutoSave({
    projectId,
    debounceMs = 2000,
    onStatusChange,
}: UseAutoSaveOptions) {
    const { watch, getValues } = useFormContext();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastSavedRef = useRef<string>("");
    const statusRef = useRef<AutoSaveStatus>("idle");

    const setStatus = useCallback((status: AutoSaveStatus) => {
        statusRef.current = status;
        onStatusChange?.(status);
    }, [onStatusChange]);

    const saveToVault = useCallback(async () => {
        if (!projectId) return;

        const formData = getValues();
        const dataHash = JSON.stringify(formData);

        // Skip if no changes
        if (dataHash === lastSavedRef.current) {
            return;
        }

        setStatus("saving");

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senderData: formData.sender,
                    receiverData: formData.receiver,
                    // Note: screens are saved separately via ScreenConfig model
                    // This just syncs the sender/receiver metadata
                }),
            });

            if (response.ok) {
                lastSavedRef.current = dataHash;
                setStatus("saved");

                // Reset to idle after showing "Saved" for a moment
                setTimeout(() => {
                    if (statusRef.current === "saved") {
                        setStatus("idle");
                    }
                }, 2000);
            } else {
                console.error("Auto-save failed:", await response.text());
                setStatus("error");
            }
        } catch (error) {
            console.error("Auto-save error:", error);
            setStatus("error");
        }
    }, [projectId, getValues, setStatus]);

    // Debounced save on form changes
    useEffect(() => {
        if (!projectId) return;

        const subscription = watch(() => {
            // Clear any pending save
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            // Schedule a new save after debounce delay
            timeoutRef.current = setTimeout(() => {
                saveToVault();
            }, debounceMs);
        });

        return () => {
            subscription.unsubscribe();
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [projectId, watch, saveToVault, debounceMs]);

    // Save on field blur (additional trigger for critical fields)
    const triggerSave = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        saveToVault();
    }, [saveToVault]);

    return {
        status: statusRef.current,
        triggerSave,
    };
}

export default useAutoSave;
