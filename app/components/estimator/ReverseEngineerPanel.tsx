"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { DollarSign, Search, Loader2, X, Package, Check } from "lucide-react";

interface DisplayAnswers {
    widthFt?: number;
    heightFt?: number;
    pixelPitch?: string;
    locationType?: string;
}

interface FeasibleOption {
    product: {
        id: string;
        manufacturer: string;
        modelNumber: string;
        displayName: string;
        pixelPitch: number;
        maxNits: number;
        environment: string;
    };
    layout: {
        columns: number;
        rows: number;
        totalCabinets: number;
        actualWidthFt: number;
        actualHeightFt: number;
        actualAreaSqFt: number;
    };
    pricing: {
        hardwareCost: number;
        hardwareSell: number;
        estimatedServicesCost: number;
        estimatedTotal: number;
        headroom: number;
        percentOfBudget: number;
    };
    fitScore: number;
    rank: number;
}

interface ReverseEngineerPanelProps {
    open: boolean;
    onClose: () => void;
    currentDisplay: DisplayAnswers;
    onSelectProduct: (productId: string, productName: string) => void;
}

export default function ReverseEngineerPanel({
    open,
    onClose,
    currentDisplay,
    onSelectProduct,
}: ReverseEngineerPanelProps) {
    const [budget, setBudget] = useState("");
    const [widthFt, setWidthFt] = useState(
        currentDisplay.widthFt?.toString() || ""
    );
    const [heightFt, setHeightFt] = useState(
        currentDisplay.heightFt?.toString() || ""
    );
    const [isIndoor, setIsIndoor] = useState(
        currentDisplay.locationType !== "outdoor"
    );
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<FeasibleOption[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const handleSearch = useCallback(async () => {
        const budgetNum = parseFloat(budget);
        const widthNum = parseFloat(widthFt);
        const heightNum = parseFloat(heightFt);

        if (!budgetNum || budgetNum <= 0) {
            setError("Enter a valid budget amount");
            return;
        }
        if (!widthNum || widthNum <= 0) {
            setError("Enter a valid width");
            return;
        }
        if (!heightNum || heightNum <= 0) {
            setError("Enter a valid height");
            return;
        }

        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const res = await fetch("/api/products/reverse", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    targetBudget: budgetNum,
                    widthFt: widthNum,
                    heightFt: heightNum,
                    isIndoor,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || `Request failed: ${res.status}`);
            }

            const data = await res.json();
            setResults(data.options || []);
        } catch (err: any) {
            setError(err.message || "Failed to fetch options");
        } finally {
            setLoading(false);
        }
    }, [budget, widthFt, heightFt, isIndoor]);

    const handleSelect = useCallback(
        (option: FeasibleOption) => {
            setSelectedId(option.product.id);
            onSelectProduct(option.product.id, option.product.displayName);
        },
        [onSelectProduct]
    );

    const formatCurrency = (n: number) =>
        "$" + n.toLocaleString("en-US", { maximumFractionDigits: 0 });

    if (!open) return null;

    return (
        <div className="fixed inset-y-0 right-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative ml-auto w-full max-w-lg bg-white shadow-lg flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
                    <div className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-[#0A52EF]" />
                        <h2 className="text-base font-semibold text-[#1C1C1C]">
                            Price-to-Spec
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-[#F7F7F7] text-[#878787]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="px-5 py-4 space-y-4 border-b border-[#E8E8E8]">
                    <div>
                        <label className="block text-xs font-medium text-[#616161] mb-1">
                            Budget ($)
                        </label>
                        <div className="relative">
                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#878787]" />
                            <input
                                type="number"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                                placeholder="400000"
                                className="w-full pl-8 pr-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium text-[#616161] mb-1">
                                Width (ft)
                            </label>
                            <input
                                type="number"
                                value={widthFt}
                                onChange={(e) => setWidthFt(e.target.value)}
                                placeholder="20"
                                className="w-full px-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[#616161] mb-1">
                                Height (ft)
                            </label>
                            <input
                                type="number"
                                value={heightFt}
                                onChange={(e) => setHeightFt(e.target.value)}
                                placeholder="10"
                                className="w-full px-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="text-xs font-medium text-[#616161]">
                            Environment
                        </label>
                        <div className="flex rounded border border-[#E8E8E8] overflow-hidden text-xs">
                            <button
                                onClick={() => setIsIndoor(true)}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    isIndoor
                                        ? "bg-[#1C1C1C] text-white"
                                        : "bg-white text-[#616161] hover:bg-[#F7F7F7]"
                                )}
                            >
                                Indoor
                            </button>
                            <button
                                onClick={() => setIsIndoor(false)}
                                className={cn(
                                    "px-3 py-1.5 transition-colors",
                                    !isIndoor
                                        ? "bg-[#1C1C1C] text-white"
                                        : "bg-white text-[#616161] hover:bg-[#F7F7F7]"
                                )}
                            >
                                Outdoor
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="text-xs text-red-600">{error}</p>
                    )}

                    <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-2 rounded bg-[#1C1C1C] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Search className="h-4 w-4" />
                        )}
                        {loading ? "Searching…" : "Find Options"}
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {results === null && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-[#878787]">
                            <Package className="h-10 w-10 mb-2 opacity-40" />
                            <p className="text-sm">
                                Enter a budget to find matching products
                            </p>
                        </div>
                    )}

                    {results !== null && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-[#878787]">
                            <Package className="h-10 w-10 mb-2 opacity-40" />
                            <p className="text-sm font-medium text-[#1C1C1C]">
                                No products fit this budget
                            </p>
                            <p className="text-xs mt-1">
                                Try increasing the budget or reducing the display size
                            </p>
                        </div>
                    )}

                    {results && results.length > 0 && (
                        <div className="space-y-3">
                            <p className="text-xs text-[#878787]">
                                {results.length} option{results.length !== 1 ? "s" : ""} found
                            </p>
                            {results.map((opt) => {
                                const budgetColor =
                                    opt.pricing.percentOfBudget > 95
                                        ? "bg-red-500"
                                        : opt.pricing.percentOfBudget > 80
                                          ? "bg-amber-500"
                                          : "bg-emerald-500";

                                return (
                                    <div
                                        key={opt.product.id}
                                        className={cn(
                                            "border rounded p-3 transition-colors",
                                            selectedId === opt.product.id
                                                ? "border-[#0A52EF] bg-blue-50/30"
                                                : "border-[#E8E8E8] hover:bg-[#F7F7F7]"
                                        )}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div>
                                                <p className="text-sm font-medium text-[#1C1C1C]">
                                                    {opt.product.displayName}
                                                </p>
                                                <p className="text-xs text-[#878787]">
                                                    {opt.product.manufacturer} · {opt.product.pixelPitch}mm · {opt.product.maxNits} nits
                                                </p>
                                            </div>
                                            <span className="text-xs font-mono bg-[#F7F7F7] px-1.5 py-0.5 rounded text-[#616161]">
                                                #{opt.rank}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                                            <div className="text-[#616161]">
                                                Layout:{" "}
                                                <span className="text-[#1C1C1C] font-medium">
                                                    {opt.layout.columns}×{opt.layout.rows} = {opt.layout.totalCabinets} cabinets
                                                </span>
                                            </div>
                                            <div className="text-[#616161]">
                                                Size:{" "}
                                                <span className="text-[#1C1C1C] font-medium">
                                                    {opt.layout.actualWidthFt}×{opt.layout.actualHeightFt} ft
                                                </span>
                                            </div>
                                            <div className="text-[#616161]">
                                                Estimated:{" "}
                                                <span className="text-[#1C1C1C] font-medium">
                                                    {formatCurrency(opt.pricing.estimatedTotal)}
                                                </span>
                                            </div>
                                            <div className="text-[#616161]">
                                                Headroom:{" "}
                                                <span className="text-emerald-600 font-medium">
                                                    {formatCurrency(opt.pricing.headroom)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Budget bar */}
                                        <div className="w-full h-1.5 bg-[#E8E8E8] rounded-full overflow-hidden mb-2">
                                            <div
                                                className={cn("h-full rounded-full transition-all", budgetColor)}
                                                style={{
                                                    width: `${Math.min(100, opt.pricing.percentOfBudget)}%`,
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-[#878787]">
                                                {opt.pricing.percentOfBudget}% of budget · Fit: {opt.fitScore}/100
                                            </span>
                                            <button
                                                onClick={() => handleSelect(opt)}
                                                className={cn(
                                                    "flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors",
                                                    selectedId === opt.product.id
                                                        ? "bg-[#0A52EF] text-white"
                                                        : "bg-[#1C1C1C] text-white hover:opacity-90"
                                                )}
                                            >
                                                {selectedId === opt.product.id ? (
                                                    <>
                                                        <Check className="h-3 w-3" />
                                                        Selected
                                                    </>
                                                ) : (
                                                    "Use This Product"
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
