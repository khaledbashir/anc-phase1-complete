"use client";

import React, { useState, useCallback, useRef, createContext, useContext } from "react";
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface ConfirmOptions {
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "default" | "destructive";
}

interface AlertOptions {
    title: string;
    description: string;
    confirmLabel?: string;
}

type ConfirmResolver = (value: boolean) => void;
type AlertResolver = () => void;

interface ConfirmContextValue {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [confirmState, setConfirmState] = useState<(ConfirmOptions & { open: boolean }) | null>(null);
    const [alertState, setAlertState] = useState<(AlertOptions & { open: boolean }) | null>(null);
    const confirmResolverRef = useRef<ConfirmResolver | null>(null);
    const alertResolverRef = useRef<AlertResolver | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            confirmResolverRef.current = resolve;
            setConfirmState({ ...options, open: true });
        });
    }, []);

    const alert = useCallback((options: AlertOptions): Promise<void> => {
        return new Promise<void>((resolve) => {
            alertResolverRef.current = resolve;
            setAlertState({ ...options, open: true });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        confirmResolverRef.current?.(true);
        confirmResolverRef.current = null;
        setConfirmState(null);
    }, []);

    const handleCancel = useCallback(() => {
        confirmResolverRef.current?.(false);
        confirmResolverRef.current = null;
        setConfirmState(null);
    }, []);

    const handleAlertClose = useCallback(() => {
        alertResolverRef.current?.();
        alertResolverRef.current = null;
        setAlertState(null);
    }, []);

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}

            {/* Confirm Dialog */}
            <AlertDialog open={!!confirmState?.open} onOpenChange={(open) => { if (!open) handleCancel(); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmState?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmState?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={handleCancel}>
                            {confirmState?.cancelLabel || "Cancel"}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            className={confirmState?.variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                        >
                            {confirmState?.confirmLabel || "Continue"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Alert Dialog */}
            <AlertDialog open={!!alertState?.open} onOpenChange={(open) => { if (!open) handleAlertClose(); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{alertState?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{alertState?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={handleAlertClose}>
                            {alertState?.confirmLabel || "OK"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
    return ctx;
}
