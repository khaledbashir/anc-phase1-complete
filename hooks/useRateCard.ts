"use client";

import { useState, useEffect } from "react";

export type RateCard = Record<string, number>;

/**
 * Fetches the full rate card from /api/estimator/rates on mount.
 * Returns { rates, loading, error }.
 * Rates are null until loaded; callers should fall back to hardcoded defaults.
 */
export function useRateCard() {
    const [rates, setRates] = useState<RateCard | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const res = await fetch("/api/estimator/rates");
                if (!res.ok) throw new Error(`Rate card fetch failed: ${res.status}`);
                const data = await res.json();
                if (!cancelled) {
                    setRates(data.rates || {});
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Unknown error");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, []);

    return { rates, loading, error };
}
