"use client";

import React, { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormContext } from "react-hook-form";
import useToasts from "@/hooks/useToasts";

type AiWandProps = {
    fieldName: string;
    searchQuery?: string;
    targetFields: string[]; // Fields to fill (e.g., ["receiver.address", "receiver.city"])
};

export default function AiWand({ fieldName, searchQuery, targetFields }: AiWandProps) {
    const [loading, setLoading] = useState(false);
    const { getValues, setValue } = useFormContext();
    const { success: showSuccess, error: showError } = useToasts();

    const handleEnrich = async () => {
        const baseValue = getValues(fieldName);
        const query = searchQuery || baseValue;

        if (!query || query.length < 3) {
            showError("Please enter a name or company first.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/agent/enrich", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, targetFields }),
            });

            const data = await res.json();

            if (data.ok && data.results) {
                Object.entries(data.results).forEach(([field, value]) => {
                    if (value) setValue(field, value);
                });
                showSuccess(`AI found details for ${query}!`);
            } else {
                showError("Could not find detailed information for this client.");
            }
        } catch (e) {
            console.error("Enrichment error:", e);
            showError("AI Enrichment failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
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
    );
}
