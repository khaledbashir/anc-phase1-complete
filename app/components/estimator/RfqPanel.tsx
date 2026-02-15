"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
    Send,
    Copy,
    Download,
    X,
    Check,
    ChevronRight,
    Building2,
    Loader2,
} from "lucide-react";

interface DisplayInput {
    displayName: string;
    widthFt: number;
    heightFt: number;
    pixelPitch: string;
    productName: string;
    locationType: string;
    serviceType: string;
    isReplacement: boolean;
}

interface RfqPanelProps {
    open: boolean;
    onClose: () => void;
    answers: {
        clientName: string;
        projectName: string;
        location: string;
        displays: DisplayInput[];
    };
}

const KNOWN_MANUFACTURERS = ["LG", "Yaham", "Absen", "Unilumin"];

export default function RfqPanel({ open, onClose, answers }: RfqPanelProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedManufacturers, setSelectedManufacturers] = useState<
        Set<string>
    >(new Set());
    const [customManufacturer, setCustomManufacturer] = useState("");
    const [deliveryTimeline, setDeliveryTimeline] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [specialReqs, setSpecialReqs] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedTexts, setGeneratedTexts] = useState<
        Map<string, string>
    >(new Map());
    const [activePreview, setActivePreview] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleManufacturer = useCallback((name: string) => {
        setSelectedManufacturers((prev) => {
            const next = new Set(prev);
            if (next.has(name)) next.delete(name);
            else next.add(name);
            return next;
        });
    }, []);

    const addCustom = useCallback(() => {
        const trimmed = customManufacturer.trim();
        if (trimmed) {
            setSelectedManufacturers((prev) => new Set(prev).add(trimmed));
            setCustomManufacturer("");
        }
    }, [customManufacturer]);

    const allManufacturers = [
        ...KNOWN_MANUFACTURERS,
        ...Array.from(selectedManufacturers).filter(
            (m) => !KNOWN_MANUFACTURERS.includes(m)
        ),
    ];

    const handleGenerate = useCallback(async () => {
        if (selectedManufacturers.size === 0) {
            setError("Select at least one manufacturer");
            return;
        }

        setLoading(true);
        setError(null);
        const texts = new Map<string, string>();

        const specialRequirements = specialReqs
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        try {
            for (const manufacturer of selectedManufacturers) {
                const res = await fetch("/api/rfq/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        answers,
                        manufacturer,
                        options: {
                            deliveryTimeline: deliveryTimeline || undefined,
                            includeSpares: true,
                            contactName: contactName || undefined,
                            contactEmail: contactEmail || undefined,
                            specialRequirements:
                                specialRequirements.length > 0
                                    ? specialRequirements
                                    : undefined,
                        },
                    }),
                });

                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    throw new Error(
                        data.error ||
                            `Failed for ${manufacturer}: ${res.status}`
                    );
                }

                const data = await res.json();
                texts.set(manufacturer, data.rfq.bodyText);
            }

            setGeneratedTexts(texts);
            setActivePreview(Array.from(texts.keys())[0]);
            setStep(3);
        } catch (err: any) {
            setError(err.message || "Failed to generate RFQ");
        } finally {
            setLoading(false);
        }
    }, [
        selectedManufacturers,
        answers,
        deliveryTimeline,
        contactName,
        contactEmail,
        specialReqs,
    ]);

    const handleCopy = useCallback(async () => {
        if (!activePreview) return;
        const text = generatedTexts.get(activePreview);
        if (!text) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for non-secure contexts
            const ta = document.createElement("textarea");
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [activePreview, generatedTexts]);

    const handleDownload = useCallback(() => {
        if (!activePreview) return;
        const text = generatedTexts.get(activePreview);
        if (!text) return;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `RFQ_${answers.projectName.replace(/\s+/g, "_")}_${activePreview.replace(/\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [activePreview, generatedTexts, answers.projectName]);

    const handleReset = useCallback(() => {
        setStep(1);
        setGeneratedTexts(new Map());
        setActivePreview(null);
        setCopied(false);
        setError(null);
    }, []);

    if (!open) return null;

    return (
        <div className="fixed inset-y-0 right-0 z-50 flex">
            <div className="fixed inset-0 bg-black/20" onClick={onClose} />

            <div className="relative ml-auto w-full max-w-lg bg-white shadow-lg flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E8E8]">
                    <div className="flex items-center gap-2">
                        <Send className="h-5 w-5 text-[#0A52EF]" />
                        <h2 className="text-base font-semibold text-[#1C1C1C]">
                            Generate RFQ
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-[#F7F7F7] text-[#878787]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-1 px-5 py-2 border-b border-[#E8E8E8] text-xs text-[#878787]">
                    <span
                        className={cn(
                            step >= 1
                                ? "text-[#0A52EF] font-medium"
                                : "text-[#878787]"
                        )}
                    >
                        1. Manufacturers
                    </span>
                    <ChevronRight className="h-3 w-3" />
                    <span
                        className={cn(
                            step >= 2
                                ? "text-[#0A52EF] font-medium"
                                : "text-[#878787]"
                        )}
                    >
                        2. Details
                    </span>
                    <ChevronRight className="h-3 w-3" />
                    <span
                        className={cn(
                            step >= 3
                                ? "text-[#0A52EF] font-medium"
                                : "text-[#878787]"
                        )}
                    >
                        3. Preview
                    </span>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/* Step 1: Select manufacturers */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-[#1C1C1C] mb-1">
                                    Select Manufacturer(s)
                                </p>
                                <p className="text-xs text-[#878787] mb-3">
                                    A separate RFQ will be generated for each
                                    selected manufacturer.
                                </p>
                            </div>

                            <div className="space-y-2">
                                {allManufacturers.map((m) => (
                                    <label
                                        key={m}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 border rounded cursor-pointer transition-colors",
                                            selectedManufacturers.has(m)
                                                ? "border-[#0A52EF] bg-blue-50/30"
                                                : "border-[#E8E8E8] hover:bg-[#F7F7F7]"
                                        )}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedManufacturers.has(
                                                m
                                            )}
                                            onChange={() =>
                                                toggleManufacturer(m)
                                            }
                                            className="accent-[#0A52EF]"
                                        />
                                        <Building2 className="h-4 w-4 text-[#878787]" />
                                        <span className="text-sm text-[#1C1C1C]">
                                            {m}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customManufacturer}
                                    onChange={(e) =>
                                        setCustomManufacturer(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") addCustom();
                                    }}
                                    placeholder="Other manufacturer…"
                                    className="flex-1 px-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                                />
                                <button
                                    onClick={addCustom}
                                    disabled={!customManufacturer.trim()}
                                    className="px-3 py-1.5 text-xs rounded bg-[#F7F7F7] text-[#616161] hover:bg-[#E8E8E8] disabled:opacity-50 transition-colors"
                                >
                                    Add
                                </button>
                            </div>

                            {error && (
                                <p className="text-xs text-red-600">{error}</p>
                            )}

                            <button
                                onClick={() => {
                                    if (selectedManufacturers.size === 0) {
                                        setError(
                                            "Select at least one manufacturer"
                                        );
                                        return;
                                    }
                                    setError(null);
                                    setStep(2);
                                }}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded bg-[#1C1C1C] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Optional details */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-[#1C1C1C]">
                                Optional Details
                            </p>

                            <div>
                                <label className="block text-xs font-medium text-[#616161] mb-1">
                                    Delivery Timeline
                                </label>
                                <input
                                    type="text"
                                    value={deliveryTimeline}
                                    onChange={(e) =>
                                        setDeliveryTimeline(e.target.value)
                                    }
                                    placeholder="e.g. Q3 2026"
                                    className="w-full px-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#616161] mb-1">
                                        Contact Name
                                    </label>
                                    <input
                                        type="text"
                                        value={contactName}
                                        onChange={(e) =>
                                            setContactName(e.target.value)
                                        }
                                        placeholder="John Smith"
                                        className="w-full px-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#616161] mb-1">
                                        Contact Email
                                    </label>
                                    <input
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) =>
                                            setContactEmail(e.target.value)
                                        }
                                        placeholder="john@anc.com"
                                        className="w-full px-3 py-2 text-sm border-b border-[#E8E8E8] focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-[#616161] mb-1">
                                    Special Requirements
                                </label>
                                <textarea
                                    value={specialReqs}
                                    onChange={(e) =>
                                        setSpecialReqs(e.target.value)
                                    }
                                    placeholder="One requirement per line…"
                                    rows={4}
                                    className="w-full px-3 py-2 text-sm border border-[#E8E8E8] rounded focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787] resize-none"
                                />
                            </div>

                            {/* Display summary */}
                            <div className="bg-[#F7F7F7] rounded p-3">
                                <p className="text-xs font-medium text-[#616161] mb-1">
                                    Displays included ({answers.displays.length}
                                    ):
                                </p>
                                {answers.displays.map((d, i) => (
                                    <p
                                        key={i}
                                        className="text-xs text-[#1C1C1C]"
                                    >
                                        {d.displayName || `Display ${i + 1}`} —{" "}
                                        {d.widthFt}×{d.heightFt} ft ·{" "}
                                        {d.pixelPitch || "TBD"}
                                    </p>
                                ))}
                            </div>

                            {error && (
                                <p className="text-xs text-red-600">{error}</p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-2 rounded border border-[#E8E8E8] text-sm text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleGenerate}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-[#1C1C1C] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                    {loading ? "Generating…" : "Generate RFQ"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {/* Manufacturer tabs */}
                            {generatedTexts.size > 1 && (
                                <div className="flex gap-1 overflow-x-auto">
                                    {Array.from(generatedTexts.keys()).map(
                                        (m) => (
                                            <button
                                                key={m}
                                                onClick={() =>
                                                    setActivePreview(m)
                                                }
                                                className={cn(
                                                    "px-3 py-1.5 text-xs rounded whitespace-nowrap transition-colors",
                                                    activePreview === m
                                                        ? "bg-[#1C1C1C] text-white"
                                                        : "bg-[#F7F7F7] text-[#616161] hover:bg-[#E8E8E8]"
                                                )}
                                            >
                                                {m}
                                            </button>
                                        )
                                    )}
                                </div>
                            )}

                            {/* Preview text */}
                            {activePreview && (
                                <pre className="bg-[#F7F7F7] rounded p-4 text-xs text-[#1C1C1C] whitespace-pre-wrap font-mono leading-relaxed max-h-[60vh] overflow-y-auto border border-[#E8E8E8]">
                                    {generatedTexts.get(activePreview)}
                                </pre>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded bg-[#1C1C1C] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy to Clipboard
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="flex items-center justify-center gap-2 px-4 py-2 rounded border border-[#E8E8E8] text-sm text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                                >
                                    <Download className="h-4 w-4" />
                                    .txt
                                </button>
                            </div>

                            <button
                                onClick={handleReset}
                                className="w-full py-2 rounded border border-[#E8E8E8] text-sm text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                            >
                                Generate Another
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
