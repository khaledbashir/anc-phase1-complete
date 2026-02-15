"use client";

import React, { useState, useCallback, useEffect } from "react";
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
    Monitor,
    Hash,
    Calendar,
    MapPin,
    FileText,
} from "lucide-react";
import type { RfqDocument, RfqLineItem } from "@/services/rfq/rfqGenerator";
import type { ScreenCalc, ProductSpec } from "@/app/components/estimator/EstimatorBridge";

// ============================================================================
// TYPES
// ============================================================================

interface DisplayInput {
    displayName: string;
    widthFt: number;
    heightFt: number;
    pixelPitch: string;
    productName: string;
    locationType: string;
    serviceType: string;
    isReplacement: boolean;
    installComplexity?: string;
    productId?: string;
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
    /** ScreenCalc[] from EstimatorBridge — enriches RFQ with resolution, area */
    calcs?: ScreenCalc[];
    /** Product specs keyed by productId */
    productSpecs?: Record<string, ProductSpec>;
}

const FALLBACK_MANUFACTURERS = ["LG", "Yaham", "Absen", "Unilumin"];

// ============================================================================
// COMPONENT
// ============================================================================

export default function RfqPanel({ open, onClose, answers, calcs, productSpecs }: RfqPanelProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedManufacturers, setSelectedManufacturers] = useState<Set<string>>(new Set());
    const [customManufacturer, setCustomManufacturer] = useState("");
    const [deliveryTimeline, setDeliveryTimeline] = useState("");
    const [contactName, setContactName] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [specialReqs, setSpecialReqs] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedRfqs, setGeneratedRfqs] = useState<Map<string, RfqDocument>>(new Map());
    const [activePreview, setActivePreview] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dbManufacturers, setDbManufacturers] = useState<string[]>([]);

    // Fetch manufacturers from DB on open
    useEffect(() => {
        if (!open) return;
        fetch("/api/manufacturers/list")
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (data?.manufacturers?.length) {
                    setDbManufacturers(data.manufacturers);
                }
            })
            .catch(() => { /* fallback to hardcoded */ });
    }, [open]);

    const manufacturers = dbManufacturers.length > 0 ? dbManufacturers : FALLBACK_MANUFACTURERS;

    const allManufacturers = [
        ...manufacturers,
        ...Array.from(selectedManufacturers).filter((m) => !manufacturers.includes(m)),
    ];

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

    // Build enriched answers with calc + product data
    const buildEnrichedAnswers = useCallback(() => {
        return {
            ...answers,
            calcs: calcs?.map((c) => ({
                pixelsW: c.pixelsW,
                pixelsH: c.pixelsH,
                areaSqFt: c.areaSqFt,
                cabinetLayout: c.cabinetLayout,
            })),
            // ProductSpec from EstimatorBridge has cabinet/power data, not display-level
            // specs like maxNits/ipRating. Pass null for now — these can be enriched
            // later when ManufacturerProduct data is wired directly.
            products: answers.displays.map(() => null),
        };
    }, [answers, calcs]);

    const handleGenerate = useCallback(async () => {
        if (selectedManufacturers.size === 0) {
            setError("Select at least one manufacturer");
            return;
        }

        setLoading(true);
        setError(null);

        const specialRequirements = specialReqs
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);

        const enrichedAnswers = buildEnrichedAnswers();

        try {
            // Parallel generation for all manufacturers
            const entries = await Promise.all(
                Array.from(selectedManufacturers).map(async (manufacturer) => {
                    const res = await fetch("/api/rfq/generate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            answers: enrichedAnswers,
                            manufacturer,
                            options: {
                                deliveryTimeline: deliveryTimeline || undefined,
                                includeSpares: true,
                                contactName: contactName || undefined,
                                contactEmail: contactEmail || undefined,
                                specialRequirements: specialRequirements.length > 0 ? specialRequirements : undefined,
                            },
                        }),
                    });

                    if (!res.ok) {
                        const data = await res.json().catch(() => ({}));
                        throw new Error(data.error || `Failed for ${manufacturer}: ${res.status}`);
                    }

                    const data = await res.json();
                    return [manufacturer, data.rfq] as [string, RfqDocument];
                })
            );

            const rfqs = new Map(entries);
            setGeneratedRfqs(rfqs);
            setActivePreview(Array.from(rfqs.keys())[0]);
            setStep(3);
        } catch (err: any) {
            setError(err.message || "Failed to generate RFQ");
        } finally {
            setLoading(false);
        }
    }, [selectedManufacturers, buildEnrichedAnswers, deliveryTimeline, contactName, contactEmail, specialReqs]);

    const activeRfq = activePreview ? generatedRfqs.get(activePreview) : null;

    const handleCopy = useCallback(async () => {
        if (!activeRfq) return;
        try {
            await navigator.clipboard.writeText(activeRfq.bodyText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = activeRfq.bodyText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [activeRfq]);

    const handleDownload = useCallback(() => {
        if (!activeRfq) return;
        const blob = new Blob([activeRfq.bodyText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${activeRfq.rfqNumber}_${activeRfq.recipientCompany.replace(/\s+/g, "_")}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, [activeRfq]);

    const handleReset = useCallback(() => {
        setStep(1);
        setGeneratedRfqs(new Map());
        setActivePreview(null);
        setCopied(false);
        setError(null);
    }, []);

    if (!open) return null;

    return (
        <div className="flex flex-col h-full w-full bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E8E8E8]">
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
                {[
                    { n: 1, label: "Manufacturers" },
                    { n: 2, label: "Details" },
                    { n: 3, label: "Preview" },
                ].map((s, i) => (
                    <React.Fragment key={s.n}>
                        {i > 0 && <ChevronRight className="h-3 w-3" />}
                        <span className={cn(
                            step >= s.n ? "text-[#0A52EF] font-medium" : "text-[#878787]"
                        )}>
                            {s.n}. {s.label}
                        </span>
                    </React.Fragment>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* ─── Step 1: Manufacturers ─── */}
                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-[#1C1C1C] mb-1">
                                Select Manufacturer(s)
                            </p>
                            <p className="text-xs text-[#878787] mb-3">
                                A separate RFQ will be generated for each manufacturer.
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
                                        checked={selectedManufacturers.has(m)}
                                        onChange={() => toggleManufacturer(m)}
                                        className="accent-[#0A52EF]"
                                    />
                                    <Building2 className="h-4 w-4 text-[#878787]" />
                                    <span className="text-sm text-[#1C1C1C]">{m}</span>
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={customManufacturer}
                                onChange={(e) => setCustomManufacturer(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") addCustom(); }}
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

                        {error && <p className="text-xs text-red-600">{error}</p>}

                        <button
                            onClick={() => {
                                if (selectedManufacturers.size === 0) {
                                    setError("Select at least one manufacturer");
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

                {/* ─── Step 2: Details ─── */}
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
                                onChange={(e) => setDeliveryTimeline(e.target.value)}
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
                                    onChange={(e) => setContactName(e.target.value)}
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
                                    onChange={(e) => setContactEmail(e.target.value)}
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
                                onChange={(e) => setSpecialReqs(e.target.value)}
                                placeholder="One requirement per line…"
                                rows={3}
                                className="w-full px-3 py-2 text-sm border border-[#E8E8E8] rounded focus:border-[#0A52EF] outline-none bg-transparent text-[#1C1C1C] placeholder:text-[#878787] resize-none"
                            />
                        </div>

                        {/* Display summary */}
                        <div className="bg-[#F7F7F7] rounded p-3 space-y-1.5">
                            <p className="text-xs font-medium text-[#616161]">
                                Displays ({answers.displays.length}):
                            </p>
                            {answers.displays.map((d, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-[#1C1C1C]">
                                    <Monitor className="h-3 w-3 text-[#878787] shrink-0" />
                                    <span className="font-medium">{d.displayName || `Display ${i + 1}`}</span>
                                    <span className="text-[#878787]">
                                        {d.widthFt}&apos; × {d.heightFt}&apos; · {d.pixelPitch || "TBD"}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {error && <p className="text-xs text-red-600">{error}</p>}

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

                {/* ─── Step 3: Rich Preview ─── */}
                {step === 3 && activeRfq && (
                    <div className="space-y-4">
                        {/* Manufacturer tabs */}
                        {generatedRfqs.size > 1 && (
                            <div className="flex gap-1 overflow-x-auto pb-1">
                                {Array.from(generatedRfqs.keys()).map((m) => (
                                    <button
                                        key={m}
                                        onClick={() => setActivePreview(m)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors font-medium",
                                            activePreview === m
                                                ? "bg-[#0A52EF] text-white"
                                                : "bg-[#F7F7F7] text-[#616161] hover:bg-[#E8E8E8]"
                                        )}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* RFQ Header Card */}
                        <div className="bg-[#F7F7F7] rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Hash className="h-3.5 w-3.5 text-[#0A52EF]" />
                                    <span className="text-xs font-mono font-semibold text-[#0A52EF]">{activeRfq.rfqNumber}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-[#878787]">
                                    <Calendar className="h-3 w-3" />
                                    {activeRfq.date}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[#1C1C1C]">
                                    {activeRfq.subject}
                                </p>
                                <p className="text-xs text-[#878787] mt-0.5">
                                    To: {activeRfq.recipientCompany} Sales Team
                                </p>
                            </div>
                            <div className="flex gap-4 text-xs text-[#616161]">
                                <div className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {activeRfq.clientName}
                                </div>
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {activeRfq.location}
                                </div>
                            </div>
                        </div>

                        {/* Display Cards */}
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-[#616161] uppercase tracking-wider">
                                Display Requirements
                            </p>
                            {activeRfq.lineItems.map((item, i) => (
                                <DisplayCard key={i} item={item} />
                            ))}
                        </div>

                        {/* Sections */}
                        {activeRfq.includeSpares && (
                            <div className="bg-amber-50/60 border border-amber-200/50 rounded p-3">
                                <p className="text-xs font-semibold text-amber-800">Spare Parts</p>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    2% spare modules + 2% spare power supplies per display
                                </p>
                            </div>
                        )}

                        {activeRfq.specialRequirements.length > 0 && (
                            <div className="bg-purple-50/60 border border-purple-200/50 rounded p-3">
                                <p className="text-xs font-semibold text-purple-800 mb-1">Special Requirements</p>
                                {activeRfq.specialRequirements.map((r, i) => (
                                    <p key={i} className="text-xs text-purple-700">• {r}</p>
                                ))}
                            </div>
                        )}

                        {activeRfq.deliveryTimeline && (
                            <div className="flex items-center gap-2 text-xs text-[#616161] bg-[#F7F7F7] rounded px-3 py-2">
                                <Calendar className="h-3 w-3" />
                                Target delivery: <span className="font-medium text-[#1C1C1C]">{activeRfq.deliveryTimeline}</span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={handleCopy}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded text-sm font-medium transition-all",
                                    copied
                                        ? "bg-emerald-600 text-white"
                                        : "bg-[#1C1C1C] text-white hover:opacity-90"
                                )}
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copied ? "Copied!" : "Copy Email Text"}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded border border-[#E8E8E8] text-sm text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                            >
                                <Download className="h-4 w-4" />
                                <FileText className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        <button
                            onClick={handleReset}
                            className="w-full py-2 rounded text-xs text-[#878787] hover:text-[#616161] hover:bg-[#F7F7F7] transition-colors"
                        >
                            Generate Another
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// DISPLAY CARD SUB-COMPONENT
// ============================================================================

function DisplayCard({ item }: { item: RfqLineItem }) {
    return (
        <div className="border border-[#E8E8E8] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-[#0A52EF]" />
                    <span className="text-sm font-semibold text-[#1C1C1C]">{item.displayName}</span>
                </div>
                {item.quantity > 1 && (
                    <span className="text-xs font-medium bg-[#0A52EF]/10 text-[#0A52EF] px-2 py-0.5 rounded-full">
                        Qty: {item.quantity}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <SpecRow label="Dimensions" value={`${item.widthFt}' × ${item.heightFt}' (${item.areaSqFt} sqft)`} />
                <SpecRow label="Pixel Pitch" value={item.pixelPitch} />
                {item.resolution && <SpecRow label="Resolution" value={`${item.resolution} px`} />}
                <SpecRow label="Environment" value={item.environment} highlight={item.environment === "Outdoor"} />
                {item.brightnessNits && <SpecRow label="Brightness" value={`${item.brightnessNits.toLocaleString()} nits`} />}
                {item.ipRating && <SpecRow label="IP Rating" value={item.ipRating} />}
                <SpecRow label="Service" value={item.serviceType} />
                {item.preferredProduct && <SpecRow label="Preferred" value={item.preferredProduct} highlight />}
            </div>
            {item.notes && (
                <p className="text-xs text-amber-700 bg-amber-50/60 px-2 py-1 rounded">
                    {item.notes}
                </p>
            )}
        </div>
    );
}

function SpecRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-[#878787] shrink-0 w-[72px]">{label}</span>
            <span className={cn(
                "text-xs truncate",
                highlight ? "font-medium text-[#0A52EF]" : "text-[#1C1C1C]"
            )}>
                {value}
            </span>
        </div>
    );
}
