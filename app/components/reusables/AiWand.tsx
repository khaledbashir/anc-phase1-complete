"use client";

import React, { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormContext } from "react-hook-form";
import useToasts from "@/hooks/useToasts";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type AiWandProps = {
    fieldName: string;
    searchQuery?: string;
    targetFields: string[]; // Fields to fill (e.g., ["receiver.address", "receiver.city"])
};

type EnrichCandidate = {
    label: string;
    confidence: number;
    notes: string;
    results: Record<string, string>;
};

export default function AiWand({ fieldName, searchQuery, targetFields }: AiWandProps) {
    const [loading, setLoading] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [candidates, setCandidates] = useState<EnrichCandidate[]>([]);
    const [selectedCandidate, setSelectedCandidate] = useState<string>("");
    const [lastQuery, setLastQuery] = useState<string>("");
    const [correctedQuery, setCorrectedQuery] = useState<string>("");
    const { getValues, setValue } = useFormContext();
    const { success: showSuccess, error: showError } = useToasts();

    const applyResults = (results: Record<string, string>, originalQuery: string, corrected: string) => {
        if (corrected && corrected.trim().length > 0 && typeof fieldName === "string") {
            const q = originalQuery.toString().trim();
            const cq = corrected.toString().trim();
            if (q.length > 0 && cq.length > 0 && q.toLowerCase() !== cq.toLowerCase()) {
                setValue(fieldName, cq);
            }
        }
        Object.entries(results).forEach(([field, value]) => {
            if (value) setValue(field, value);
        });
    };

    const handleEnrich = async () => {
        const baseValue = getValues(fieldName);
        const query = searchQuery || baseValue;

        if (!query || query.length < 3) {
            showError("Please enter a name or company first.");
            return;
        }

        setLoading(true);
        setLastQuery(String(query));
        const controller = new AbortController();
        let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => controller.abort(), 25000);
        try {
            const res = await fetch("/api/agent/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, targetFields }),
                signal: controller.signal,
            });
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = null;

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                showError(data?.error || "AI enrichment failed.");
                return;
            }

            const corrected = typeof data?.correctedQuery === "string" ? data.correctedQuery : String(query);
            setCorrectedQuery(corrected);

            const incomingCandidates: EnrichCandidate[] = Array.isArray(data?.candidates)
                ? data.candidates
                : data?.results
                    ? [{ label: corrected, confidence: 1, notes: "", results: data.results }]
                    : [];

            if (incomingCandidates.length === 0) {
                showError("Could not find detailed information for this client.");
                return;
            }

            if (incomingCandidates.length === 1) {
                const c = incomingCandidates[0];
                applyResults(c.results, String(query), corrected);
                showSuccess(`AI filled details for ${corrected}!`);
                return;
            }

            setCandidates(incomingCandidates);
            setSelectedCandidate(incomingCandidates[0]?.label ?? "");
            setPickerOpen(true);
        } catch (e) {
            console.error("Enrichment error:", e);
            if ((e as Error)?.name === "AbortError") {
                showError("Lookup timed out. Check your connection or try again.");
            } else {
                showError("AI Enrichment failed.");
            }
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={loading}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleEnrich();
                }}
                className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 active:scale-95 transition-all"
                title="Auto-fill details via AI Search"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : <Wand2 className="h-4 w-4" />}
            </Button>

            <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
                <DialogContent className="max-w-xl bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800">
                    <DialogHeader>
                        <DialogTitle>Select the correct match</DialogTitle>
                        <DialogDescription>
                            We found multiple possible matches for "{lastQuery}". Pick the right one.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="text-xs text-zinc-500">
                            Corrected query: <span className="text-zinc-200 font-semibold">{correctedQuery || lastQuery}</span>
                        </div>

                        <div className="flex flex-col gap-2">
                            {candidates.map((c) => {
                                const city = c.results["receiver.city"] || "";
                                const venue = c.results["details.venue"] || "";
                                const address = c.results["receiver.address"] || "";
                                const zip = c.results["receiver.zipCode"] || "";
                                const meta = [venue, city, zip].filter(Boolean).join(" · ");
                                const hint = [address, meta].filter(Boolean).join(" — ");
                                const conf = Number.isFinite(c.confidence) ? Math.round(c.confidence * 100) : 0;
                                const isSelected = selectedCandidate === c.label;

                                return (
                                    <button
                                        key={c.label}
                                        type="button"
                                        onClick={() => setSelectedCandidate(c.label)}
                                        className={cn(
                                            "w-full text-left rounded-xl border px-4 py-4 transition-colors",
                                            isSelected
                                                ? "border-brand-blue/50 bg-brand-blue/10"
                                                : "border-zinc-800 bg-zinc-950/30 hover:border-brand-blue/25"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-sm text-white">{c.label}</div>
                                                {hint ? <div className="text-xs text-zinc-300/70 mt-2 leading-relaxed break-words">{hint}</div> : null}
                                                {c.notes ? <div className="text-xs text-zinc-500 mt-2">{c.notes}</div> : null}
                                            </div>
                                            <div className={cn(
                                                "shrink-0 text-[11px] font-bold uppercase tracking-widest ml-2",
                                                isSelected ? "text-brand-blue" : "text-zinc-200/80"
                                            )}>
                                                {conf}%
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setPickerOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={() => {
                                const chosen = candidates.find((c) => c.label === selectedCandidate) || candidates[0];
                                if (!chosen) return;
                                applyResults(chosen.results, lastQuery, correctedQuery || lastQuery);
                                setPickerOpen(false);
                                showSuccess(`AI filled details for ${chosen.label}!`);
                            }}
                            className="shadow-[0_0_20px_rgba(10,82,239,0.15)]"
                        >
                            Apply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
