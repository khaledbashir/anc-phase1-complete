"use client";

import { useEffect, useRef, useCallback } from "react";
import { useFormContext } from "react-hook-form";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveOptions {
    projectId: string | null;
    debounceMs?: number;
    onStatusChange?: (status: AutoSaveStatus) => void;
}

/**
 * Validate that a project ID is safe to use for API calls.
 * Rejects reserved route names like "new", "create", etc.
 */
function isValidProjectId(id: string | null): id is string {
    if (!id) return false;
    // Reject reserved route segments that could be mistaken for IDs
    const reserved = ["new", "create", "edit", "delete", "api", "assets"];
    if (reserved.includes(id.toLowerCase())) return false;
    // Must look like a real ID (cuid, uuid, or numeric)
    // CUID: starts with letter, 25 chars
    // UUID: 36 chars with dashes
    // Numeric: all digits
    const isCuid = /^[a-z][a-z0-9]{24}$/i.test(id);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const isNumeric = /^\d+$/.test(id);
    return isCuid || isUuid || isNumeric;
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
        if (!isValidProjectId(projectId)) return;

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
                    proposalName: formData.details?.proposalName,
                    status: formData.details?.status,
                    calculationMode: formData.details?.calculationMode,
                    internalAudit: formData.details?.internalAudit,
                    clientSummary: formData.details?.clientSummary,
                    screens: formData.details?.screens, // Deep sync screens
                    taxRateOverride: formData.details?.taxRateOverride,
                    bondRateOverride: formData.details?.bondRateOverride,
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
        if (!isValidProjectId(projectId)) return;

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
